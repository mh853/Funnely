import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import {
  fetchSheetData,
  parseSheetToLeads,
  ColumnMapping,
} from '@/lib/google-sheets'

// Service role client
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Vercel Cron Job 또는 외부 cron 서비스에서 호출
// vercel.json에서 설정: { "crons": [{ "path": "/api/cron/sync-sheets", "schedule": "*/30 * * * *" }] }
export async function GET(request: NextRequest) {
  // Vercel Cron 인증 확인
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    // 활성화된 동기화 설정 가져오기
    const { data: configs, error: configError } = await supabaseAdmin
      .from('sheet_sync_configs')
      .select('*')
      .eq('is_active', true)

    if (configError) {
      console.error('Config fetch error:', configError)
      return NextResponse.json({ error: 'Config fetch failed' }, { status: 500 })
    }

    if (!configs || configs.length === 0) {
      return NextResponse.json({ message: 'No active sync configs', synced: 0 })
    }

    const results = []

    for (const config of configs) {
      try {
        // 마지막 동기화 시간 확인 (중복 실행 방지)
        const now = new Date()
        const lastSynced = config.last_synced_at
          ? new Date(config.last_synced_at)
          : null
        const intervalMs = (config.sync_interval_minutes || 60) * 60 * 1000

        if (lastSynced && now.getTime() - lastSynced.getTime() < intervalMs) {
          results.push({
            spreadsheetId: config.spreadsheet_id,
            status: 'skipped',
            reason: 'Not due yet',
          })
          continue
        }

        // 시트 데이터 가져오기
        const range = `${config.sheet_name || 'Sheet1'}!A:Z`
        const rows = await fetchSheetData(config.spreadsheet_id, range)

        if (rows.length < 2) {
          results.push({
            spreadsheetId: config.spreadsheet_id,
            status: 'empty',
            imported: 0,
          })
          continue
        }

        // 시트 데이터를 leads 형식으로 변환
        const columnMapping = config.column_mapping as ColumnMapping
        const sheetLeads = parseSheetToLeads(rows, columnMapping)

        // 중복 체크
        const { data: existingLeads } = await supabaseAdmin
          .from('leads')
          .select('phone_hash')
          .eq('company_id', config.company_id)

        const existingHashes = new Set(
          existingLeads?.map((l) => l.phone_hash) || []
        )

        const newLeads = sheetLeads.filter((lead) => {
          const phoneHash = crypto
            .createHash('sha256')
            .update(lead.phone.replace(/\D/g, ''))
            .digest('hex')
          return !existingHashes.has(phoneHash)
        })

        let importedCount = 0

        if (newLeads.length > 0) {
          const leadsToInsert = newLeads.map((lead) => ({
            company_id: config.company_id,
            landing_page_id: config.landing_page_id || null,
            name: lead.name,
            phone: lead.phone,
            email: lead.email || null,
            phone_hash: crypto
              .createHash('sha256')
              .update(lead.phone.replace(/\D/g, ''))
              .digest('hex'),
            source: 'google_sheets',
            custom_fields: lead.customFields || [],
            status: 'new',
            created_at: lead.createdAt
              ? new Date(lead.createdAt).toISOString()
              : new Date().toISOString(),
          }))

          const { data: inserted } = await supabaseAdmin
            .from('leads')
            .insert(leadsToInsert)
            .select('id')

          importedCount = inserted?.length || 0
        }

        // 동기화 시간 업데이트
        await supabaseAdmin
          .from('sheet_sync_configs')
          .update({ last_synced_at: now.toISOString() })
          .eq('id', config.id)

        // 로그 저장
        await supabaseAdmin.from('sheet_sync_logs').insert({
          company_id: config.company_id,
          spreadsheet_id: config.spreadsheet_id,
          sheet_name: config.sheet_name,
          imported_count: importedCount,
          total_rows: sheetLeads.length,
          duplicates_skipped: sheetLeads.length - newLeads.length,
        })

        results.push({
          spreadsheetId: config.spreadsheet_id,
          status: 'success',
          imported: importedCount,
          total: sheetLeads.length,
          duplicates: sheetLeads.length - newLeads.length,
        })
      } catch (syncError: any) {
        console.error(`Sync error for ${config.spreadsheet_id}:`, syncError)

        // 에러 로그 저장
        await supabaseAdmin.from('sheet_sync_logs').insert({
          company_id: config.company_id,
          spreadsheet_id: config.spreadsheet_id,
          sheet_name: config.sheet_name,
          imported_count: 0,
          error_message: syncError.message,
        })

        results.push({
          spreadsheetId: config.spreadsheet_id,
          status: 'error',
          error: syncError.message,
        })
      }
    }

    return NextResponse.json({
      message: 'Cron sync completed',
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('Cron sync error:', error)
    return NextResponse.json(
      { error: error.message || 'Cron sync failed' },
      { status: 500 }
    )
  }
}
