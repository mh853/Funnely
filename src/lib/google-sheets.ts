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
        phone: getColumnValue(row, headers, columnMapping.phone) || '',
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
    .filter((lead) => lead.name && lead.phone) // 필수 필드 검증
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
