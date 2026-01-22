import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import {
  fetchSheetData,
  parseSheetToLeads,
  ColumnMapping,
  DEFAULT_META_MAPPING,
} from '@/lib/google-sheets'

// Service role client for admin operations
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      spreadsheetId,
      sheetName = 'Sheet1',
      companyId,
      landingPageId,
      columnMapping = DEFAULT_META_MAPPING,
      syncKey, // 동기화 인증 키 (cron job용)
    } = body

    // 인증 확인 (cron job 또는 사용자 요청)
    const cronSecret = process.env.CRON_SECRET
    if (syncKey && cronSecret && syncKey !== cronSecret) {
      return NextResponse.json({ error: '인증 실패' }, { status: 401 })
    }

    if (!spreadsheetId || !companyId) {
      return NextResponse.json(
        { error: 'spreadsheetId와 companyId는 필수입니다' },
        { status: 400 }
      )
    }

    // 시트 데이터 가져오기
    // 시트 이름에 공백이나 특수문자가 있으면 작은따옴표로 감싸야 함
    const sanitizedSheetName = sheetName.includes(' ') || sheetName.includes("'")
      ? `'${sheetName.replace(/'/g, "''")}'`
      : sheetName
    const range = `${sanitizedSheetName}!A:Z`
    const rows = await fetchSheetData(spreadsheetId, range)

    if (rows.length < 2) {
      return NextResponse.json(
        { error: '시트에 데이터가 없습니다', imported: 0 },
        { status: 200 }
      )
    }

    // 시트 데이터를 leads 형식으로 변환
    const sheetLeads = parseSheetToLeads(rows, columnMapping as ColumnMapping)

    // 중복 체크를 위한 기존 전화번호 해시 가져오기
    const { data: existingLeads } = await supabaseAdmin
      .from('leads')
      .select('phone_hash')
      .eq('company_id', companyId)

    const existingHashes = new Set(
      existingLeads?.map((l) => l.phone_hash) || []
    )

    // 새로운 리드만 필터링
    const newLeads = sheetLeads.filter((lead) => {
      const phoneHash = crypto
        .createHash('sha256')
        .update(lead.phone.replace(/\D/g, ''))
        .digest('hex')
      return !existingHashes.has(phoneHash)
    })

    if (newLeads.length === 0) {
      return NextResponse.json({
        message: '새로운 데이터가 없습니다',
        imported: 0,
        total: sheetLeads.length,
        duplicates: sheetLeads.length,
      })
    }

    // 리드 삽입
    const leadsToInsert = newLeads.map((lead) => ({
      company_id: companyId,
      landing_page_id: landingPageId || null,
      name: lead.name,
      phone: lead.phone,
      email: lead.email || null,
      phone_hash: crypto
        .createHash('sha256')
        .update(lead.phone.replace(/\D/g, ''))
        .digest('hex'),
      source: lead.source || 'google_sheets',
      custom_fields: lead.customFields || [],
      status: 'new',
      created_at: lead.createdAt
        ? new Date(lead.createdAt).toISOString()
        : new Date().toISOString(),
    }))

    const { data: inserted, error: insertError } = await supabaseAdmin
      .from('leads')
      .insert(leadsToInsert)
      .select('id')

    if (insertError) {
      console.error('Insert error:', insertError)
      return NextResponse.json(
        { error: '데이터 삽입 중 오류가 발생했습니다' },
        { status: 500 }
      )
    }

    // 동기화 로그 저장
    await supabaseAdmin.from('sheet_sync_logs').insert({
      company_id: companyId,
      spreadsheet_id: spreadsheetId,
      sheet_name: sheetName,
      imported_count: inserted?.length || 0,
      total_rows: sheetLeads.length,
      duplicates_skipped: sheetLeads.length - newLeads.length,
    })

    return NextResponse.json({
      message: '동기화 완료',
      imported: inserted?.length || 0,
      total: sheetLeads.length,
      duplicates: sheetLeads.length - newLeads.length,
    })
  } catch (error: any) {
    console.error('Sheet sync error:', error)
    return NextResponse.json(
      { error: error.message || '동기화 실패' },
      { status: 500 }
    )
  }
}

// GET: 동기화 상태 조회
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const companyId = searchParams.get('companyId')

  if (!companyId) {
    return NextResponse.json({ error: 'companyId 필수' }, { status: 400 })
  }

  const { data: logs } = await supabaseAdmin
    .from('sheet_sync_logs')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(10)

  return NextResponse.json({ logs: logs || [] })
}
