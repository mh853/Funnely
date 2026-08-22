// 엑셀 업로드로 DB(리드)를 일괄 등록하는 API - DB 수동 추가의 대량 버전
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { encryptPhone } from '@/lib/encryption/phone'
import { parseSheetToLeads, findMissingColumns, ColumnMapping } from '@/lib/google-sheets'
import crypto from 'crypto'

// 엑셀 업로드 템플릿의 고정 헤더 - 구글시트 연동처럼 회사별 컬럼 매핑 설정이 없으므로
// 클라이언트가 내려주는 템플릿과 반드시 일치해야 한다.
const COLUMN_MAPPING: ColumnMapping = { name: '이름', phone: '전화번호', email: '이메일' }

const MAX_ROWS = 2000

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    const companyId = userProfile.company_id

    const body = await request.json()
    const rows: unknown = body.rows

    if (!Array.isArray(rows) || rows.length < 2) {
      return NextResponse.json(
        { error: { message: '엑셀 파일에 데이터가 없습니다. 템플릿을 다운로드해 작성해주세요.' } },
        { status: 400 }
      )
    }

    if (rows.length - 1 > MAX_ROWS) {
      return NextResponse.json(
        { error: { message: `한 번에 최대 ${MAX_ROWS.toLocaleString()}건까지 업로드할 수 있습니다.` } },
        { status: 400 }
      )
    }

    // 셀 값이 숫자/불리언 등으로 섞여 들어와도 이후 로직(trim 등)이 문자열을
    // 전제로 하므로 여기서 문자열로 통일한다.
    const stringRows = (rows as unknown[][]).map((row) =>
      row.map((cell) => (cell === null || cell === undefined ? '' : String(cell)))
    )

    const missingColumns = findMissingColumns(stringRows[0], COLUMN_MAPPING)
    if (missingColumns.length > 0) {
      return NextResponse.json(
        {
          error: {
            message: `템플릿 형식과 다릅니다. 필수 컬럼이 없습니다: ${missingColumns.join(', ')}`,
          },
        },
        { status: 400 }
      )
    }

    const parsedLeads = parseSheetToLeads(stringRows, COLUMN_MAPPING)
    const totalRows = stringRows.length - 1

    if (parsedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        total: totalRows,
        duplicates: 0,
        blacklisted: 0,
        invalid: totalRows,
      })
    }

    // 기존 전화번호 해시 조회 - range() 없이 조회하면 supabase의 암묵적
    // max_rows(1000)에 걸려 리드가 1000건을 넘는 회사부터 중복 검사가 조용히
    // 불완전해진다(구글시트 동기화 라우트와 동일한 이유로 배치 조회).
    const existingHashes = new Set<string>()
    {
      const BATCH_SIZE = 1000
      let offset = 0
      while (true) {
        const { data } = await supabase
          .from('leads')
          .select('phone_hash')
          .eq('company_id', companyId)
          .range(offset, offset + BATCH_SIZE - 1)

        if (!data || data.length === 0) break
        data.forEach((row: { phone_hash: string }) => existingHashes.add(row.phone_hash))
        if (data.length < BATCH_SIZE) break
        offset += BATCH_SIZE
      }
    }

    // 블랙리스트 체크 - DB 수동추가(단건) API와 동일하게, 로그인한 내부 직원이
    // 쓰는 화면이므로 우회 방지 목적의 침묵 처리 없이 결과에 별도로 집계해 알려준다.
    const blacklistedNumbers = new Set<string>()
    {
      const { data } = await supabase
        .from('phone_blacklist')
        .select('phone_number')
        .eq('company_id', companyId)
      data?.forEach((row: { phone_number: string }) => blacklistedNumbers.add(row.phone_number))
    }

    // 파일 안에서 같은 전화번호가 여러 행에 있으면 기존 DB 대조만으로는 못
    // 걸러지므로, 먼저 나온 행만 남기고 같은 배치 내에서도 중복 제거한다.
    const seenInBatch = new Set<string>()
    let blacklistedSkipped = 0
    const newLeads = parsedLeads.filter((lead) => {
      const cleanPhone = lead.phone.replace(/\D/g, '')
      if (blacklistedNumbers.has(cleanPhone)) {
        blacklistedSkipped++
        return false
      }
      const phoneHash = crypto.createHash('sha256').update(cleanPhone).digest('hex')
      if (existingHashes.has(phoneHash) || seenInBatch.has(phoneHash)) {
        return false
      }
      seenInBatch.add(phoneHash)
      return true
    })

    const invalidCount = totalRows - parsedLeads.length
    const duplicateCount = parsedLeads.length - newLeads.length - blacklistedSkipped

    if (newLeads.length === 0) {
      return NextResponse.json({
        success: true,
        imported: 0,
        total: totalRows,
        duplicates: duplicateCount,
        blacklisted: blacklistedSkipped,
        invalid: invalidCount,
      })
    }

    // 회사가 설정한 기본 리드 상태 조회 - status:'new' 하드코딩 시 "DB 상태 관리"의
    // "기본값으로 설정" 기능이 실제로는 아무 효과가 없다(다른 리드 생성 경로와 동일한 이유).
    const { data: defaultStatus } = await supabase
      .from('lead_statuses')
      .select('code')
      .eq('company_id', companyId)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle()

    const leadsToInsert = newLeads.map((lead) => ({
      company_id: companyId,
      name: lead.name,
      phone: encryptPhone(lead.phone),
      phone_hash: crypto.createHash('sha256').update(lead.phone.replace(/\D/g, '')).digest('hex'),
      email: lead.email || null,
      status: defaultStatus?.code || 'new',
      source: 'manual',
      device_type: 'manual',
    }))

    const { data: inserted, error: insertError } = await supabase
      .from('leads')
      .insert(leadsToInsert)
      .select('id')

    if (insertError) {
      console.error('Bulk lead insert error:', insertError)
      return NextResponse.json(
        { error: { message: '데이터 삽입 중 오류가 발생했습니다.' } },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      imported: inserted?.length || 0,
      total: totalRows,
      duplicates: duplicateCount,
      blacklisted: blacklistedSkipped,
      invalid: invalidCount,
    })
  } catch (error: any) {
    console.error('Bulk lead upload error:', error)
    return NextResponse.json(
      { error: { message: error.message || '엑셀 업로드 처리 중 오류가 발생했습니다.' } },
      { status: 500 }
    )
  }
}
