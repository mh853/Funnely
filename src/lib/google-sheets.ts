import { google } from 'googleapis'

// Google Sheets 클라이언트 생성
export async function getGoogleSheetsClient() {
  const credentials = process.env.GOOGLE_SERVICE_ACCOUNT_KEY

  if (!credentials) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_KEY 환경변수가 설정되지 않았습니다')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: JSON.parse(credentials),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })

  const sheets = google.sheets({ version: 'v4', auth })
  return sheets
}

// 시트 메타데이터 가져오기 (시트 이름 목록)
export async function getSheetNames(spreadsheetId: string): Promise<string[]> {
  const sheets = await getGoogleSheetsClient()

  const response = await sheets.spreadsheets.get({
    spreadsheetId,
    fields: 'sheets.properties.title',
  })

  return (
    response.data.sheets?.map((sheet) => sheet.properties?.title || '') || []
  )
}

// 시트 데이터 가져오기
export async function fetchSheetData(spreadsheetId: string, range: string) {
  const sheets = await getGoogleSheetsClient()

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  return response.data.values || []
}

// 시트 데이터를 leads 형식으로 변환
export interface SheetLeadData {
  name: string
  phone: string
  email?: string
  source?: string
  customFields?: Array<{ label: string; value: string }>
  createdAt?: string
}

export function parseSheetToLeads(
  rows: string[][],
  columnMapping: ColumnMapping
): SheetLeadData[] {
  if (rows.length < 2) return [] // 헤더 포함 최소 2행 필요

  const headers = rows[0]
  const dataRows = rows.slice(1)

  return dataRows
    .map((row) => {
      const lead: SheetLeadData = {
        name: getColumnValue(row, headers, columnMapping.name) || '',
        phone: normalizeSheetPhone(getColumnValue(row, headers, columnMapping.phone) || ''),
      }

      if (columnMapping.email) {
        lead.email = getColumnValue(row, headers, columnMapping.email)
      }

      if (columnMapping.source) {
        lead.source = getColumnValue(row, headers, columnMapping.source)
      }

      if (columnMapping.createdAt) {
        lead.createdAt = getColumnValue(row, headers, columnMapping.createdAt)
      }

      // 커스텀 필드 매핑
      if (columnMapping.customFields && columnMapping.customFields.length > 0) {
        lead.customFields = columnMapping.customFields
          .map((cf) => ({
            label: cf.label,
            value: getColumnValue(row, headers, cf.column) || '',
          }))
          .filter((cf) => cf.value) // 빈 값 제거
      }

      return lead
    })
    // 필수 필드 검증 - phone이 비어있지 않은지만 보고 실제 전화번호 형태인지는
    // 확인하지 않으면, 전화번호 칸에 이름/메모 같은 비숫자 값이 들어와도 그대로
    // 리드로 통과되고(landing-pages/submit 라우트는 이미 자릿수까지 검증함),
    // 게다가 phone_hash는 숫자만 추출해 해시하므로 서로 다른 비숫자 값이
    // 전부 같은(빈 문자열) 해시로 수렴해 두 번째 행부터는 "중복"으로 조용히
    // 버려진다.
    .filter((lead) => {
      if (!lead.name || !lead.phone) return false
      const digitsOnly = lead.phone.replace(/\D/g, '')
      return digitsOnly.length >= 9 && digitsOnly.length <= 11
    })
}

// 구글 시트 특유의 숫자 서식 문제를 보정한다: 전화번호 컬럼을 "숫자"로 서식
// 지정한 셀은 앞자리 0이 잘려 내려온다("010-1234-5678" → "1012345678"). 이미
// 텍스트로 입력되어 대시 등을 포함한 값(다른 모든 리드 생성 경로와 동일한 형태)은
// 건드리지 않고, 순수 숫자 10자리(0이 잘린 11자리 한국 휴대폰 번호)로만 이루어진
// 값일 때만 앞에 0을 복원한다. 단, 이미 0으로 시작하는 10자리 숫자(서울 지역
// 유선전화 02-XXXX-XXXX 같은, 원래부터 완전한 번호)까지 조건 없이 0을 또
// 붙이면 11자리 무효 번호로 오염되므로 0으로 시작하지 않는 경우로 한정한다.
function normalizeSheetPhone(rawPhone: string): string {
  const trimmed = rawPhone.trim()
  if (/^\d{10}$/.test(trimmed) && !trimmed.startsWith('0')) {
    return `0${trimmed}`
  }
  return rawPhone
}

function getColumnValue(
  row: string[],
  headers: string[],
  columnName: string
): string | undefined {
  const index = headers.findIndex(
    (h) => h.toLowerCase().trim() === columnName.toLowerCase().trim()
  )
  return index >= 0 ? row[index]?.trim() : undefined
}

// 컬럼 매핑 타입
export interface ColumnMapping {
  name: string // 이름 컬럼
  phone: string // 전화번호 컬럼
  email?: string // 이메일 컬럼 (선택)
  source?: string // 유입 경로 컬럼 (선택)
  createdAt?: string // 생성일 컬럼 (선택)
  customFields?: Array<{
    label: string // leads에 저장할 라벨
    column: string // 시트 컬럼명
  }>
}

// 기본 Meta 광고 시트 매핑
export const DEFAULT_META_MAPPING: ColumnMapping = {
  name: '이름',
  phone: '전화번호',
  email: '이메일',
  source: '광고명',
  createdAt: '생성일',
  customFields: [],
}
