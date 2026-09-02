import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { calculateMRR, calculateARR } from '@/lib/revenue/calculations'
import { calculateHealthScore, toCustomerHealthScoreRow } from '@/lib/health/calculateHealthScore'
import {
  fetchSheetData,
  parseSheetToLeads,
  findMissingColumns,
  ColumnMapping,
} from '@/lib/google-sheets'
import { detectGrowthOpportunities } from '@/lib/growth/opportunityDetection'
import type { Subscription } from '@/types/revenue'
import { Resend } from 'resend'
import { FROM_ADDRESS, MAX_RETRIES } from '@/lib/email/constants'
import { decryptPhone, encryptPhone } from '@/lib/encryption/phone'
import { escapeHtml } from '@/lib/email/template-renderer'
import { toKSTDateStr, getKSTStartOfDay } from '@/lib/utils/date'
import { convertTrialSubscriptionCore } from '@/lib/subscription/convert-trial-core'
import {
  buildExpiring2dEmail,
  buildExpiringTodayEmail,
  buildWinbackEmail,
  buildDataDeletedEmail,
  PLAN_SELECT_URL,
  type LifecycleVariant,
} from '@/lib/email/subscription-lifecycle-templates'

/**
 * Unified daily tasks cron job
 * Consolidates all daily operations into single cron job
 *
 * Vercel Cron: 0 23 * * * (UTC 23:00 = KST 08:00 - Free Plan limitation: 1 cron only)
 *
 * All tasks run sequentially at 23:00 UTC (08:00 KST):
 * - Process subscription renewal charges (before expiry check)
 * - Check subscription expiry and send notifications
 * - Calculate revenue (MRR/ARR)
 * - Calculate customer health scores
 * - Sync Google Sheets
 * - Detect growth opportunities
 * - Send lead digest emails (grouped by company)
 * - Disable expired landing page timers
 *
 * Note: All times stored in database are UTC. Frontend displays in user's timezone.
 */
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Cron] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results: any = {
      timestamp: now.toISOString(),
      tasksExecuted: [],
    }

    console.log('[Cron] Starting daily tasks at 23:00 UTC (08:00 KST)')

    // Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // Task -1: Process Subscription Renewals (만료 처리보다 먼저 실행)
    console.log('[Cron] Running subscription renewal charges')
    try {
      const renewalResult = await processSubscriptionRenewals(supabase)
      results.tasksExecuted.push({
        task: 'subscription_renewal',
        status: 'success',
        ...renewalResult,
      })
    } catch (error) {
      console.error('[Cron] Subscription renewal error:', error)
      results.tasksExecuted.push({
        task: 'subscription_renewal',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task -1b: 체험 종료 + 카드 등록된 구독 자동전환 (만료 처리보다 먼저 실행해야
    // 아래 checkSubscriptionExpiry가 이미 active로 바뀐 구독을 trial 만료로 잘못
    // 처리하지 않는다)
    console.log('[Cron] Running trial auto-conversion')
    try {
      const autoConvertResult = await autoConvertExpiredTrials(supabase)
      results.tasksExecuted.push({
        task: 'trial_auto_convert',
        status: 'success',
        ...autoConvertResult,
      })
    } catch (error) {
      console.error('[Cron] Trial auto-conversion error:', error)
      results.tasksExecuted.push({
        task: 'trial_auto_convert',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 0: Check Subscription Expiry (PRIORITY)
    console.log('[Cron] Running subscription expiry check')
    try {
      const subscriptionResult = await checkSubscriptionExpiry(supabase)
      results.tasksExecuted.push({
        task: 'subscription_expiry_check',
        status: 'success',
        ...subscriptionResult,
      })
    } catch (error) {
      console.error('[Cron] Subscription check error:', error)
      results.tasksExecuted.push({
        task: 'subscription_expiry_check',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 0b: 만료 2일전/당일/2일후/1개월후 이메일 (노션 32번)
    console.log('[Cron] Running expiry lifecycle emails')
    try {
      const lifecycleResult = await sendExpiryLifecycleEmails(supabase)
      results.tasksExecuted.push({
        task: 'expiry_lifecycle_emails',
        status: 'success',
        ...lifecycleResult,
      })
    } catch (error) {
      console.error('[Cron] Expiry lifecycle emails error:', error)
      results.tasksExecuted.push({
        task: 'expiry_lifecycle_emails',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 0c: 만료 후 7일 뒤 회사 데이터 소프트 삭제 플래그 세팅 (노션 32번)
    console.log('[Cron] Running soft delete of expired company data')
    try {
      const softDeleteResult = await softDeleteExpiredCompanyData(supabase)
      results.tasksExecuted.push({
        task: 'soft_delete_expired_company_data',
        status: 'success',
        ...softDeleteResult,
      })
    } catch (error) {
      console.error('[Cron] Soft delete error:', error)
      results.tasksExecuted.push({
        task: 'soft_delete_expired_company_data',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 0d: 소프트 삭제 30일 경과 회사 데이터 하드 삭제 (노션 32번)
    console.log('[Cron] Running hard purge of deleted company data')
    try {
      const hardPurgeResult = await hardPurgeDeletedCompanyData(supabase)
      results.tasksExecuted.push({
        task: 'hard_purge_deleted_company_data',
        status: 'success',
        ...hardPurgeResult,
      })
    } catch (error) {
      console.error('[Cron] Hard purge error:', error)
      results.tasksExecuted.push({
        task: 'hard_purge_deleted_company_data',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 1: Calculate Revenue
    console.log('[Cron] Running revenue calculation')
    try {
      const revenueResult = await calculateRevenue(supabase)
      results.tasksExecuted.push({
        task: 'revenue_calculation',
        status: 'success',
        ...revenueResult,
      })
    } catch (error) {
      console.error('[Cron] Revenue calculation error:', error)
      results.tasksExecuted.push({
        task: 'revenue_calculation',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 2: Calculate Health Scores
    console.log('[Cron] Running health score calculation')
    try {
      const healthResult = await calculateHealthScores(supabase)
      results.tasksExecuted.push({
        task: 'health_scores',
        status: 'success',
        ...healthResult,
      })
    } catch (error) {
      console.error('[Cron] Health score calculation error:', error)
      results.tasksExecuted.push({
        task: 'health_scores',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 3: Sync Google Sheets
    console.log('[Cron] Running Google Sheets sync')
    try {
      const sheetsResult = await syncGoogleSheets(supabase)
      results.tasksExecuted.push({
        task: 'sheets_sync',
        status: 'success',
        ...sheetsResult,
      })
    } catch (error) {
      console.error('[Cron] Sheets sync error:', error)
      results.tasksExecuted.push({
        task: 'sheets_sync',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 4: Detect Growth Opportunities
    console.log('[Cron] Running growth opportunity detection')
    try {
      const growthResult = await detectGrowthOpportunities(supabase)
      results.tasksExecuted.push({
        task: 'growth_opportunities',
        status: growthResult.success ? 'success' : 'partial',
        ...growthResult,
      })
    } catch (error) {
      console.error('[Cron] Growth detection error:', error)
      results.tasksExecuted.push({
        task: 'growth_opportunities',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 5: Send Lead Digest Emails
    console.log('[Cron] Running lead digest emails')
    try {
      const digestResult = await sendLeadDigestEmails(supabase)
      results.tasksExecuted.push({
        task: 'lead_digest',
        status: 'success',
        ...digestResult,
      })
    } catch (error) {
      console.error('[Cron] Lead digest error:', error)
      results.tasksExecuted.push({
        task: 'lead_digest',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 6: Send Pending Payment Notification Emails
    console.log('[Cron] Running payment notification emails')
    try {
      const paymentNotifResult = await sendPaymentNotificationEmails(supabase)
      results.tasksExecuted.push({
        task: 'payment_notifications',
        status: 'success',
        ...paymentNotifResult,
      })
    } catch (error) {
      console.error('[Cron] Payment notifications error:', error)
      results.tasksExecuted.push({
        task: 'payment_notifications',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 6b: Retry pending transactional emails (ticket reply 등)
    console.log('[Cron] Retrying pending transactional emails')
    try {
      const retryResult = await retryPendingTransactionalEmails(supabase)
      results.tasksExecuted.push({
        task: 'transactional_email_retry',
        status: 'success',
        ...retryResult,
      })
    } catch (error) {
      console.error('[Cron] Transactional email retry error:', error)
      results.tasksExecuted.push({
        task: 'transactional_email_retry',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 7: Disable Expired Landing Page Timers
    console.log('[Cron] Running expired timer check')
    try {
      const timerResult = await disableExpiredTimers(supabase)
      results.tasksExecuted.push({
        task: 'disable_expired_timers',
        status: 'success',
        ...timerResult,
      })
    } catch (error) {
      console.error('[Cron] Timer expiry check error:', error)
      results.tasksExecuted.push({
        task: 'disable_expired_timers',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 8: Clean Up Old Notifications
    console.log('[Cron] Running notification cleanup')
    try {
      const cleanupResult = await cleanupOldNotifications(supabase)
      results.tasksExecuted.push({
        task: 'notification_cleanup',
        status: 'success',
        ...cleanupResult,
      })
    } catch (error) {
      console.error('[Cron] Notification cleanup error:', error)
      results.tasksExecuted.push({
        task: 'notification_cleanup',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 9: Send Admin Daily Report Digest
    console.log('[Cron] Running admin report digest')
    try {
      const digestResult = await sendAdminReportDigest(supabase)
      results.tasksExecuted.push({
        task: 'admin_report_digest',
        status: 'success',
        ...digestResult,
      })
    } catch (error) {
      console.error('[Cron] Admin report digest error:', error)
      results.tasksExecuted.push({
        task: 'admin_report_digest',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    // Task 10: 결제 정식 오픈 알림 신청 - 관리자 요약메일 (신규 신청이 있을 때만)
    console.log('[Cron] Running payment launch notify digest')
    try {
      const notifyDigestResult = await sendPaymentLaunchNotifyDigest(supabase)
      results.tasksExecuted.push({
        task: 'payment_launch_notify_digest',
        status: 'success',
        ...notifyDigestResult,
      })
    } catch (error) {
      console.error('[Cron] Payment launch notify digest error:', error)
      results.tasksExecuted.push({
        task: 'payment_launch_notify_digest',
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }

    console.log(`[Cron] Daily tasks completed: ${results.tasksExecuted.length} tasks executed`)

    return NextResponse.json(results)
  } catch (error) {
    console.error('[Cron] Unexpected error:', error)
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * Calculate revenue (MRR/ARR) for all companies
 */
async function calculateRevenue(supabase: any) {
  // Fetch all revenue-generating subscriptions
  // status='active'만 보면, 이번 달 취소했지만 아직 기간이 안 지나 이미 결제완료·
  // 이용중인(기간종료형 취소) 구독의 매출이 매일 저장되는 revenue_metrics에서
  // 통째로 빠져, MRR 추이차트가 실제보다 낮게 소급 기록됐다(83차 QA) - cancelled도
  // 함께 가져와 아래에서 current_period_end로 다시 거른다.
  const { data: fetchedSubscriptions, error: subsError } = await supabase
    .from('company_subscriptions')
    .select(
      `
      id,
      company_id,
      status,
      billing_cycle,
      plan_id,
      current_period_end,
      locked_plan_id,
      locked_price_monthly,
      locked_price_yearly,
      subscription_plans:plan_id (
        id,
        name,
        price_monthly,
        price_yearly
      )
    `
    )
    .in('status', ['active', 'cancelled'])

  if (subsError) {
    throw new Error(`Failed to fetch subscriptions: ${subsError.message}`)
  }

  const nowIso = new Date().toISOString()
  const activeSubscriptions = (fetchedSubscriptions || []).filter(
    (sub: any) =>
      sub.status === 'active' ||
      (sub.status === 'cancelled' && sub.current_period_end !== null && sub.current_period_end > nowIso)
  )

  // Group subscriptions by company
  const companySubscriptionsMap = new Map<string, any[]>()
  activeSubscriptions?.forEach((sub: any) => {
    const existing = companySubscriptionsMap.get(sub.company_id) || []
    companySubscriptionsMap.set(sub.company_id, [...existing, sub])
  })

  // Calculate MRR/ARR for each company
  const revenueMetrics = []
  // 크론은 23:00 UTC(=08:00 KST)에 실행되므로 UTC 날짜를 그대로 쓰면 KST 기준으로 하루 전 날짜가 찍힌다.
  const todayDate = toKSTDateStr(new Date())

  for (const [companyId, companySubs] of Array.from(
    companySubscriptionsMap.entries()
  )) {
    const subscriptions: Subscription[] = companySubs.map((sub: any) => {
      const plan = sub.subscription_plans
      // 그랜드파더링(61차) 중인 구독은 카탈로그가가 아니라 locked_price_*로 청구된다 -
      // admin/subscriptions/metrics와 동일한 판정 기준(63차 QA에서 이 크론은 반영 누락 확인).
      const priceLockValid =
        sub.locked_plan_id === sub.plan_id &&
        sub.locked_price_monthly !== null &&
        sub.locked_price_yearly !== null
      const monthlyPrice = priceLockValid ? sub.locked_price_monthly : plan.price_monthly
      const yearlyPrice = priceLockValid ? sub.locked_price_yearly : plan.price_yearly
      const amount =
        sub.billing_cycle === 'yearly'
          ? yearlyPrice || monthlyPrice * 12
          : monthlyPrice

      return {
        id: sub.id,
        company_id: sub.company_id,
        plan_type: plan.name,
        billing_cycle: sub.billing_cycle,
        amount: amount,
        status: sub.status,
        started_at: '',
        ended_at: null,
        created_at: '',
        updated_at: '',
      }
    })

    const mrr = subscriptions.reduce(
      (total, sub) => total + calculateMRR(sub),
      0
    )
    const arr = calculateARR(mrr)
    const firstSub = subscriptions[0]

    // revenue_metrics의 실제 컬럼은 calculated_at 단일 시점이 아니라
    // period_start/period_end(일별 스냅샷이므로 둘 다 오늘 날짜)이며,
    // mrr_growth_rate/arr_growth_rate/plan_type/billing_cycle 컬럼은 없다.
    revenueMetrics.push({
      company_id: companyId,
      period_start: todayDate,
      period_end: todayDate,
      mrr,
      arr,
      total_revenue: mrr,
      metrics: {
        plan_type: firstSub.plan_type,
        billing_cycle: firstSub.billing_cycle,
      },
    })
  }

  // Save to database
  if (revenueMetrics.length > 0) {
    const { error: insertError } = await supabase
      .from('revenue_metrics')
      .insert(revenueMetrics)

    if (insertError) {
      throw new Error(`Failed to save revenue metrics: ${insertError.message}`)
    }
  }

  return {
    companiesProcessed: companySubscriptionsMap.size,
    totalMRR: revenueMetrics.reduce((sum, m) => sum + m.mrr, 0),
    totalARR: revenueMetrics.reduce((sum, m) => sum + m.arr, 0),
  }
}

/**
 * Calculate health scores for all active companies
 */
async function calculateHealthScores(supabase: any) {
  // Get all active companies
  // companies has no 'status' column — it's tracked via the 'is_active' boolean.
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('is_active', true)

  if (companiesError) {
    throw new Error(`Failed to fetch companies: ${companiesError.message}`)
  }

  const results = []
  const errors = []

  for (const company of companies || []) {
    try {
      const healthScore = await calculateHealthScore(company.id, supabase)
      const row = toCustomerHealthScoreRow(company.id, healthScore)

      // Check if today's score exists
      // Real table name is 'customer_health_scores', not 'health_scores'.
      // KST 기준 하루 경계를 써야 한다 — UTC 기준 setHours(0,0,0,0)을 쓰면 서버(UTC)
      // 자정과 KST 자정이 9시간 어긋나 수동 재계산 기록과 겹치는 날짜 판정이 틀어질 수 있다.
      const today = getKSTStartOfDay(0)
      const tomorrow = getKSTStartOfDay(1)

      const { data: existingScore } = await supabase
        .from('customer_health_scores')
        .select('id')
        .eq('company_id', company.id)
        .gte('calculated_at', today.toISOString())
        .lt('calculated_at', tomorrow.toISOString())
        .single()

      if (existingScore) {
        // Update existing score
        await supabase
          .from('customer_health_scores')
          .update(row)
          .eq('id', existingScore.id)

        results.push({
          companyId: company.id,
          action: 'updated',
          score: healthScore.overall_score,
        })
      } else {
        // Insert new score
        await supabase.from('customer_health_scores').insert(row)

        results.push({
          companyId: company.id,
          action: 'created',
          score: healthScore.overall_score,
        })
      }
    } catch (error) {
      errors.push({
        companyId: company.id,
        error: error instanceof Error ? error.message : 'Unknown error',
      })
    }
  }

  return {
    calculated: results.length,
    errors: errors.length,
    errorDetails: errors.length > 0 ? errors : undefined,
  }
}

/**
 * Sync Google Sheets for all active configs
 */
async function syncGoogleSheets(supabase: any) {
  // Get active sync configs
  // processSubscriptionRenewals와 동일하게 회사가 비활성화(is_active=false)되거나
  // 탈퇴(withdrawn_at)했으면 그 회사 시트에서는 더 이상 동기화하면 안 된다 - 이 필터가
  // 없으면 대시보드 접근이 완전히 막힌 회사라도 시트에 새 행이 있는 한 매일 자동으로
  // 리드가 계속 생성되고 있었다(56차 QA 라이브 확인).
  const { data: configs, error: configError } = await supabase
    .from('sheet_sync_configs')
    .select('*, companies!inner(is_active, withdrawn_at)')
    .eq('is_active', true)
    .eq('companies.is_active', true)
    .is('companies.withdrawn_at', null)

  if (configError) {
    throw new Error(`Failed to fetch sync configs: ${configError.message}`)
  }

  if (!configs || configs.length === 0) {
    return { message: 'No active sync configs', synced: 0 }
  }

  const results = []

  for (const config of configs) {
    try {
      // Check if sync is due
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

      // Fetch sheet data
      // A:Z(26개 컬럼)로 하드코딩되어 있으면 컬럼 매핑이 AA 이후(커스텀 필드가 많은
      // 회사)를 가리킬 때 그 컬럼이 항상 빈 값으로 처리되며 에러도 안 남았다.
      // 시트 이름에 공백이나 작은따옴표가 있으면 A1 표기법상 작은따옴표로 감싸야
      // 하는데(수동 동기화 api/sheets/sync에는 이미 있던 처리) 이 자동 크론
      // 경로에는 빠져 있어, 시트 이름에 공백이 있는 회사는 매일 자동 동기화가
      // 조용히 계속 실패하고 있었다.
      const sheetName = config.sheet_name || 'Sheet1'
      const sanitizedSheetName =
        sheetName.includes(' ') || sheetName.includes("'")
          ? `'${sheetName.replace(/'/g, "''")}'`
          : sheetName
      const range = `${sanitizedSheetName}!A:ZZ`
      const rows = await fetchSheetData(config.spreadsheet_id, range)

      if (rows.length < 2) {
        results.push({
          spreadsheetId: config.spreadsheet_id,
          status: 'empty',
          imported: 0,
        })
        continue
      }

      // 매핑된 컬럼(이름/전화번호)이 실제 시트 헤더에 존재하는지 먼저 확인 - 헤더가
      // 바뀌면(예: "전화번호"→"연락처") 모든 행이 조용히 필터링되어 매일 "empty"로만
      // 남고 실패로 분류되지 않아 몇 달간 리드 유실이 인지되지 못할 수 있었다(81차 QA).
      const columnMapping = config.column_mapping as ColumnMapping
      const missingColumns = findMissingColumns(rows[0], columnMapping)
      if (missingColumns.length > 0) {
        throw new Error(`시트에서 다음 컬럼을 찾을 수 없습니다: ${missingColumns.join(', ')}`)
      }

      // Parse and filter new leads
      const sheetLeads = parseSheetToLeads(rows, columnMapping)

      // range() 없이 조회하면 supabase의 암묵적 max_rows(1000)에 걸려 회사의
      // 리드가 1000건을 넘는 순간부터 뒤쪽 기존 리드가 안 보여 중복 검사가
      // 조용히 불완전해진다(leads/export 등에서 이미 겪은 것과 동일 원인) -
      // 1000건씩 배치로 반복 조회해 전체를 가져온다.
      const existingLeads: { phone_hash: string }[] = []
      {
        const BATCH_SIZE = 1000
        let offset = 0
        while (true) {
          const { data, error } = await supabase
            .from('leads')
            .select('phone_hash')
            .eq('company_id', config.company_id)
            .range(offset, offset + BATCH_SIZE - 1)

          if (error) {
            throw new Error(`Failed to check existing leads: ${error.message}`)
          }
          if (!data || data.length === 0) break
          existingLeads.push(...data)
          if (data.length < BATCH_SIZE) break
          offset += BATCH_SIZE
        }
      }

      const existingHashes = new Set(
        existingLeads?.map((l: any) => l.phone_hash) || []
      )

      // 블랙리스트 체크 - 공개 제출 API(landing-pages/submit)에만 있고 이 자동 크론
      // 동기화 경로엔 없어서, 블랙리스트에 등록된 번호가 시트에 남아있으면 매일
      // 자동으로 계속 리드가 재생성될 수 있었다(66차 QA 확인 - 수동 동기화
      // api/sheets/sync도 동일 문제였음, 함께 수정).
      const blacklistedNumbers = new Set<string>()
      {
        const BATCH_SIZE = 1000
        let offset = 0
        while (true) {
          const { data } = await supabase
            .from('phone_blacklist')
            .select('phone_number')
            .eq('company_id', config.company_id)
            .range(offset, offset + BATCH_SIZE - 1)

          if (!data || data.length === 0) break
          data.forEach((row: any) => blacklistedNumbers.add(row.phone_number))
          if (data.length < BATCH_SIZE) break
          offset += BATCH_SIZE
        }
      }

      // 시트 안에서 같은 전화번호가 여러 행에 있으면 기존 DB 대조만으로는 못 걸러진다
      // (existingHashes는 DB에 이미 있는 것만 담고 있음) - 같은 배치 안에서도 먼저
      // 나온 행만 남기고 중복 제거해야 한 번의 동기화로 같은 리드가 여러 건 생기지 않는다.
      const seenPhoneHashesInBatch = new Set<string>()
      const newLeads = sheetLeads.filter((lead) => {
        const cleanPhone = lead.phone.replace(/\D/g, '')
        if (blacklistedNumbers.has(cleanPhone)) {
          return false
        }
        const phoneHash = crypto
          .createHash('sha256')
          .update(cleanPhone)
          .digest('hex')
        if (existingHashes.has(phoneHash) || seenPhoneHashesInBatch.has(phoneHash)) {
          return false
        }
        seenPhoneHashesInBatch.add(phoneHash)
        return true
      })

      // 회사가 설정한 기본 리드 상태 조회 — status:'new' 하드코딩 시 "DB 상태 관리"의
      // "기본값으로 설정" 기능이 실제로는 아무 효과가 없었다.
      const { data: defaultStatus } = await supabase
        .from('lead_statuses')
        .select('code')
        .eq('company_id', config.company_id)
        .eq('is_default', true)
        .limit(1)
        .maybeSingle()

      let importedCount = 0

      if (newLeads.length > 0) {
        const leadsToInsert = newLeads.map((lead) => {
          // 매핑된 createdAt 컬럼 값 하나가 파싱 불가능하면 new Date(...).toISOString()가
          // RangeError를 던져 map() 전체가 실패하고, 그 결과 이 스프레드시트 전체의
          // import가 조용히 중단됐다(게다가 아래에서 last_synced_at도 안 갱신되니
          // 다음 실행에서 같은 행을 또 만나 매번 반복 실패). 파싱 실패 시 현재 시각으로
          // 폴백해 그 행 하나 때문에 나머지 행까지 막히지 않도록 한다.
          let createdAtIso = new Date().toISOString()
          if (lead.createdAt) {
            const parsed = new Date(lead.createdAt)
            if (!isNaN(parsed.getTime())) {
              createdAtIso = parsed.toISOString()
            }
          }

          return {
            company_id: config.company_id,
            landing_page_id: config.landing_page_id || null,
            name: lead.name,
            phone: encryptPhone(lead.phone),
            email: lead.email || null,
            phone_hash: crypto
              .createHash('sha256')
              .update(lead.phone.replace(/\D/g, ''))
              .digest('hex'),
            // 관리자가 매핑한 source 컬럼 값을 무시하고 'google_sheets'로 덮어써서
            // 광고/캠페인 유입 경로 정보가 사라지고 있었다 - 수동 동기화(api/sheets/sync)는
            // 이미 lead.source를 올바르게 우선하고 있어 그 패턴에 맞춘다.
            source: lead.source || 'google_sheets',
            custom_fields: lead.customFields || [],
            status: defaultStatus?.code || 'new',
            created_at: createdAtIso,
          }
        })

        const { data: inserted, error: insertError } = await supabase
          .from('leads')
          .insert(leadsToInsert)
          .select('id')

        if (insertError) {
          throw new Error(`Failed to insert leads: ${insertError.message}`)
        }

        importedCount = inserted?.length || 0
      }

      // Update sync time
      await supabase
        .from('sheet_sync_configs')
        .update({ last_synced_at: now.toISOString() })
        .eq('id', config.id)

      // Log sync result - 리드 삽입은 이미 성공했으므로, 이 로그 저장 자체가
      // 실패하더라도(네트워크 순간 오류 등) 방금 성공한 동기화를 catch 블록의
      // "error"로 잘못 보고하지 않도록 별도로 감싼다.
      try {
        await supabase.from('sheet_sync_logs').insert({
          company_id: config.company_id,
          spreadsheet_id: config.spreadsheet_id,
          sheet_name: config.sheet_name,
          imported_count: importedCount,
          total_rows: sheetLeads.length,
          duplicates_skipped: sheetLeads.length - newLeads.length,
        })
      } catch (logError) {
        console.error('Failed to write sheet_sync_logs success entry:', logError)
      }

      results.push({
        spreadsheetId: config.spreadsheet_id,
        status: 'success',
        imported: importedCount,
        total: sheetLeads.length,
      })
    } catch (syncError: any) {
      // 이 실패 로그 insert 자체가 또 실패하면(네트워크 순간 오류 등) 아무 보호
      // 장치가 없어 그 예외가 for 루프를 통째로 빠져나가 이 회사 뒤에 있는
      // 나머지 회사들이 그날 조용히 전부 동기화 스킵됐다 - 로그 저장 실패는
      // 콘솔에만 남기고 반드시 다음 config로 계속 진행한다.
      try {
        await supabase.from('sheet_sync_logs').insert({
          company_id: config.company_id,
          spreadsheet_id: config.spreadsheet_id,
          sheet_name: config.sheet_name,
          imported_count: 0,
          error_message: syncError.message,
        })
      } catch (logError) {
        console.error('Failed to write sheet_sync_logs error entry:', logError)
      }

      // sheet_sync_logs에만 실패가 쌓이고 회사 관리자에게는 아무 알림도 가지 않아
      // 실패가 몇 달씩 방치되는 경우가 있었다(checkSubscriptionExpiry/disableExpiredTimers는
      // 이미 notifications에 남기는데 이 작업만 빠져 있었음) - 같은 패턴으로 알림을 남긴다.
      // 같은 회사가 매일(또는 하루에 여러 config가) 연속 실패해도 스팸이 되지 않도록,
      // 오늘 같은 유형의 알림이 이미 있으면 스킵한다.
      try {
        const todayStart = getKSTStartOfDay(0)
        const { data: alreadyNotified } = await supabase
          .from('notifications')
          .select('id')
          .eq('company_id', config.company_id)
          .eq('type', 'sheet_sync_failed')
          .gte('created_at', todayStart.toISOString())
          .limit(1)
          .maybeSingle()

        if (!alreadyNotified) {
          // syncError.message가 마침표로 끝나는 경우(Google API 에러 메시지 등)
          // 마침표가 겹쳐 보이지 않도록 정리한다.
          const cleanErrorMessage = String(syncError.message).replace(/\.+$/, '')
          await supabase.from('notifications').insert({
            company_id: config.company_id,
            title: '구글 시트 동기화 실패',
            message: `"${config.sheet_name || 'Sheet1'}" 시트 동기화에 실패했습니다: ${cleanErrorMessage}. 시트 연동 설정을 확인해주세요.`,
            type: 'sheet_sync_failed',
            metadata: {
              sheet_sync_config_id: config.id,
              spreadsheet_id: config.spreadsheet_id,
              sheet_name: config.sheet_name,
              error_message: syncError.message,
            },
          })
        }
      } catch (notifError) {
        console.error('Failed to create sheet sync failure notification:', notifError)
      }

      results.push({
        spreadsheetId: config.spreadsheet_id,
        status: 'error',
        error: syncError.message,
      })
    }
  }

  return {
    synced: results.filter((r) => r.status === 'success').length,
    results,
  }
}

/**
 * 정기 결제 갱신 처리 - 기간이 끝난 active 구독에 대해 실제 결제를 시도한다.
 *
 * 원래 supabase/functions/subscription-cron 엣지 함수가 이 역할을 하도록 작성돼
 * 있었지만, 어디에도(pg_cron, Vercel cron, 다른 코드) 스케줄링되어 있지 않아 단 한
 * 번도 자동 실행된 적이 없었다 — 그 결과 구독 기간이 끝나도 아무도 자동으로
 * 청구되지 않고, 다음날 checkSubscriptionExpiry가 결제 시도 없이 곧바로 expired로
 * 처리해버렸다. 유일하게 실제로 매일 실행되는 이 크론에 합쳐서 확실히 동작하게 한다.
 * checkSubscriptionExpiry보다 먼저 실행해야, 갱신에 성공한 구독이 새 기간으로
 * 늘어난 뒤에 곧바로 만료 처리되지 않는다.
 *
 * subscription-cron 자체는 "죽은 코드라 무해하다"는 판단과 달리 verify_jwt=true가
 * anon/service_role을 구분하지 않아 공개 anon key만으로 누구나 실행 가능한 상태였고,
 * 여기(daily-tasks)와 다른 상태값('expired' 대신 'cancelled')으로 만료 처리를 하고
 * 있어 실제 보안 위험이었다(57차 QA 확인) - Supabase 프로젝트에서 완전히 삭제 완료.
 */
async function processSubscriptionRenewals(supabase: any) {
  const now = new Date().toISOString()

  // 관리자가 회사를 비활성화/탈퇴 처리하면 PATCH /api/admin/companies/[id]가
  // 해당 회사의 company_subscriptions도 함께 suspended로 바꿔주므로 원래는 이
  // 쿼리에 걸리지 않는다. 그래도 데이터 드리프트(과거 데이터, 수동 DB 편집 등)에
  // 대비해 companies.is_active까지 한 번 더 확인하는 방어선을 둔다.
  const [activeDueRes, pastDueInGraceRes] = await Promise.all([
    supabase
      .from('company_subscriptions')
      .select('id, companies!inner(is_active, withdrawn_at)')
      .eq('status', 'active')
      .not('billing_key', 'is', null)
      .lte('current_period_end', now)
      .eq('companies.is_active', true)
      .is('companies.withdrawn_at', null),
    // past_due(유예기간) 구독은 최초 결제 실패로 current_period_end가 이미 과거로
    // 고정된 채 status만 바뀐 것이라 위 쿼리(status='active')에는 절대 걸리지 않는다 -
    // 그 결과 유예기간 7일 내내 재청구 시도가 단 한 번도 없었다(56차 QA 라이브 확인).
    // grace_period_end가 아직 지나지 않은 것만 재시도 대상에 포함한다.
    supabase
      .from('company_subscriptions')
      .select('id, companies!inner(is_active, withdrawn_at)')
      .eq('status', 'past_due')
      .not('billing_key', 'is', null)
      .gt('grace_period_end', now)
      .eq('companies.is_active', true)
      .is('companies.withdrawn_at', null),
  ])

  if (activeDueRes.error) {
    console.error('[Renewal] 갱신 대상(active) 구독 조회 실패:', activeDueRes.error)
  }
  if (pastDueInGraceRes.error) {
    console.error('[Renewal] 갱신 대상(past_due) 구독 조회 실패:', pastDueInGraceRes.error)
  }

  const dueSubs = [...(activeDueRes.data || []), ...(pastDueInGraceRes.data || [])]

  let succeeded = 0
  let failed = 0
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  for (const sub of dueSubs || []) {
    try {
      const response = await fetch(`${baseUrl}/functions/v1/toss-billing-payment`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ subscriptionId: sub.id }),
      })

      if (response.ok) {
        succeeded++
        console.log(`[Renewal] 갱신 결제 성공: ${sub.id}`)
      } else {
        failed++
        console.error(`[Renewal] 갱신 결제 실패: ${sub.id} (${response.status})`)
      }
    } catch (err) {
      failed++
      console.error(`[Renewal] 갱신 결제 처리 중 오류 (${sub.id}):`, err)
    }
  }

  return { attempted: (dueSubs || []).length, succeeded, failed }
}

// 체험 중 카드를 미리 등록해둔 구독(신규가입 시 "체험 후 자동전환" 선택)이 체험
// 기간을 넘기면, 사용자가 아무것도 하지 않아도 pending_plan_id에 저장해둔 요금제로
// 자동 결제/전환한다. 카드가 없는 체험은 그대로 두어 기존처럼 checkSubscriptionExpiry가
// expired로 전환하고 이용을 제한한다.
async function autoConvertExpiredTrials(supabase: any) {
  const now = new Date().toISOString()

  // pending_plan_id가 없는 카드등록된 체험은 건드리지 않는다 - 신규가입 "체험 후
  // 자동전환" 경로로 시작한 체험이 아니라(예: 대시보드에서 카드만 등록/변경한 경우)
  // pending_plan_id가 비어 있으면 결제 엣지 함수가 subscription.plan_id(프로)로
  // 폴백해, 동의 없이 프로 정가가 청구된다.
  const { data: expiredTrialsWithCard, error } = await supabase
    .from('company_subscriptions')
    .select('id, companies!inner(is_active, withdrawn_at)')
    .eq('status', 'trial')
    .lt('trial_end_date', now)
    .not('billing_key', 'is', null)
    .not('pending_plan_id', 'is', null)
    .eq('companies.is_active', true)
    .is('companies.withdrawn_at', null)

  if (error) {
    console.error('[Trial Auto-Convert] 대상 조회 실패:', error)
    return { attempted: 0, succeeded: 0, failed: 0 }
  }

  let succeeded = 0
  let failed = 0

  for (const sub of expiredTrialsWithCard || []) {
    try {
      const result = await convertTrialSubscriptionCore({
        subscriptionId: sub.id,
        authHeader: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
      })
      if (result.ok) {
        succeeded++
        console.log(`[Trial Auto-Convert] 전환 성공: ${sub.id}`)
      } else {
        failed++
        console.error(`[Trial Auto-Convert] 전환 실패: ${sub.id} (${result.error})`)
      }
    } catch (err) {
      failed++
      console.error(`[Trial Auto-Convert] 전환 처리 중 오류 (${sub.id}):`, err)
    }
  }

  return { attempted: (expiredTrialsWithCard || []).length, succeeded, failed }
}

/**
 * Check subscription expiry and send notifications
 * Integrated from /api/cron/check-subscriptions
 */
async function checkSubscriptionExpiry(supabase: any) {
  const now = new Date()
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  console.log(`[Subscription] 구독 체크 시작: ${now.toISOString()}`)

  // 1. 만료 7일 전 구독 찾기
  // active 구독은 current_period_end 기준, trial 구독은 trial_end_date 기준으로
  // 만료를 판단해야 한다 (trial 구독은 current_period_end가 채워지지 않으므로
  // 하나의 쿼리·조건으로 합쳐서 찾을 수 없다). trial 결과는 아래 공용 처리 로직이
  // 그대로 재사용할 수 있도록 current_period_end 필드에 trial_end_date 값을 채워 반환한다.
  const [activeExpiringSoonRes, trialExpiringSoonRes] = await Promise.all([
    supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        current_period_end,
        companies (
          id,
          name
        )
      `)
      .eq('status', 'active')
      .gte('current_period_end', now.toISOString())
      .lte('current_period_end', sevenDaysLater.toISOString()),
    supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        trial_end_date,
        companies (
          id,
          name
        )
      `)
      .eq('status', 'trial')
      .gte('trial_end_date', now.toISOString())
      .lte('trial_end_date', sevenDaysLater.toISOString()),
  ])

  if (activeExpiringSoonRes.error) {
    throw new Error(`만료 예정 구독 조회 실패: ${activeExpiringSoonRes.error.message}`)
  }
  if (trialExpiringSoonRes.error) {
    throw new Error(`만료 예정 체험 구독 조회 실패: ${trialExpiringSoonRes.error.message}`)
  }

  const expiringSoon = [
    ...(activeExpiringSoonRes.data || []),
    ...(trialExpiringSoonRes.data || []).map((s: any) => ({
      ...s,
      current_period_end: s.trial_end_date,
    })),
  ]

  console.log(`[Subscription] 만료 예정 구독 발견: ${expiringSoon?.length || 0}개`)

  // 2. 만료 예정 알림 생성 (중복 체크)
  let notificationsCreated = 0
  for (const sub of expiringSoon || []) {
    // 중복 체크
    const { data: alreadySent } = await supabase
      .from('notification_sent_logs')
      .select('id')
      .eq('subscription_id', sub.id)
      .eq('notification_type', 'subscription_expiring_soon')
      .gte('period_end', sub.current_period_end)
      .single()

    if (!alreadySent) {
      const periodEnd = new Date(sub.current_period_end)
      const daysRemaining = Math.ceil(
        (periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      )

      // 알림 생성
      const { error: notifError } = await supabase.from('notifications').insert({
        company_id: sub.company_id,
        title: `구독 만료 예정 알림`,
        message: `${(sub.companies as any)?.name || '회사'}의 구독이 ${daysRemaining}일 후 만료됩니다. 서비스 중단을 방지하려면 결제를 진행해주세요.`,
        type: 'subscription_expiring_soon',
        metadata: { subscription_id: sub.id },
      })

      if (notifError) {
        console.error(`[Subscription] 알림 생성 실패 (subscription_id: ${sub.id}):`, notifError)
        continue
      }

      // 로그 기록
      await supabase.from('notification_sent_logs').insert({
        subscription_id: sub.id,
        notification_type: 'subscription_expiring_soon',
        period_end: sub.current_period_end,
      })

      notificationsCreated++
      console.log(`[Subscription] 만료 예정 알림 생성: ${sub.id} (${daysRemaining}일 남음)`)
    }
  }

  // 3. 만료된 구독 찾기 (active/past_due는 current_period_end, trial은 trial_end_date 기준)
  const [activeExpiredRes, trialExpiredRes] = await Promise.all([
    supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        current_period_end,
        grace_period_end,
        companies (
          id,
          name
        )
      `)
      .in('status', ['active', 'past_due'])
      .lt('current_period_end', now.toISOString()),
    supabase
      .from('company_subscriptions')
      .select(`
        id,
        company_id,
        status,
        trial_end_date,
        companies (
          id,
          name
        )
      `)
      .eq('status', 'trial')
      .lt('trial_end_date', now.toISOString()),
  ])

  if (activeExpiredRes.error) {
    throw new Error(`만료된 구독 조회 실패: ${activeExpiredRes.error.message}`)
  }
  if (trialExpiredRes.error) {
    throw new Error(`만료된 체험 구독 조회 실패: ${trialExpiredRes.error.message}`)
  }

  // trial은 유예 기간 개념이 없으므로 grace_period_end는 항상 null로 채워
  // 아래 공용 처리 로직이 바로 'expired'로 전환하도록 한다.
  const expiredSubs = [
    ...(activeExpiredRes.data || []),
    ...(trialExpiredRes.data || []).map((s: any) => ({
      ...s,
      current_period_end: s.trial_end_date,
      grace_period_end: null,
    })),
  ]

  console.log(`[Subscription] 만료된 구독 발견: ${expiredSubs?.length || 0}개`)

  // 4. 만료된 구독 처리
  let subscriptionsExpired = 0
  for (const sub of expiredSubs || []) {
    const graceEnd = sub.grace_period_end ? new Date(sub.grace_period_end) : null
    const isInGracePeriod = graceEnd && graceEnd > now

    if (isInGracePeriod) {
      // Grace period 중이면 'past_due' 상태로 유지
      if (sub.status !== 'past_due') {
        await supabase
          .from('company_subscriptions')
          .update({ status: 'past_due' })
          .eq('id', sub.id)

        console.log(`[Subscription] Grace period 진입: ${sub.id}`)
      }
    } else {
      // Grace period 없거나 종료 → 'expired'로 변경. grace_period_end도 함께 비운다 -
      // 안 비우면 이 구독이 나중에 재구독될 때 오래된 값이 그대로 남아 toss-billing-payment의
      // isFirstFailure 판정(값 존재 여부로 "최초 실패"를 가림)을 오판시켜 다음 결제
      // 실패 시 유예기간이 사실상 0일로 붕괴한다(58차 QA 확인).
      const { error: updateError } = await supabase
        .from('company_subscriptions')
        .update({ status: 'expired', grace_period_end: null })
        .eq('id', sub.id)

      if (updateError) {
        console.error(`[Subscription] 구독 만료 처리 실패 (subscription_id: ${sub.id}):`, updateError)
        continue
      }

      // 만료 알림 생성 (중복 체크)
      const { data: expiredNotifSent } = await supabase
        .from('notification_sent_logs')
        .select('id')
        .eq('subscription_id', sub.id)
        .eq('notification_type', 'subscription_expired')
        .gte('period_end', sub.current_period_end)
        .single()

      if (!expiredNotifSent) {
        const companyName = (sub.companies as any)?.name || '회사'

        await supabase.from('notifications').insert({
          company_id: sub.company_id,
          title: `구독이 만료되었습니다`,
          message: `${companyName}의 구독이 만료되어 대시보드 접근이 제한됩니다. 서비스를 계속 이용하려면 플랜을 선택해주세요.`,
          type: 'subscription_expired',
          metadata: { subscription_id: sub.id },
        })

        // 이메일 발송은 더 이상 여기서 하지 않는다 - sendExpiryLifecycleEmails의
        // "당일" 메일(trial_expiring_today/sub_expiring_today)이 같은 자리를
        // 대체한다(실제 삭제 예정 안내까지 포함한 더 정확한 문구). 인앱 알림만 유지.
        await supabase.from('notification_sent_logs').insert({
          subscription_id: sub.id,
          notification_type: 'subscription_expired',
          period_end: sub.current_period_end,
        })
      }

      subscriptionsExpired++
      console.log(`[Subscription] 구독 만료 처리: ${sub.id}`)
    }
  }

  return {
    expiringSoonCount: expiringSoon?.length || 0,
    notificationsCreated,
    expiredCount: expiredSubs?.length || 0,
    subscriptionsExpired,
  }
}

// 노션 32번: 만료 2일전/당일/2일후/1개월후 이메일 - 이미 알림을 보냈는지는
// notification_sent_logs(subscription_id+notification_type+period_end)로 판별한다.
async function getCompanyAdminsForNotify(supabase: any, companyId: string) {
  const { data } = await supabase
    .from('users')
    .select('email, full_name')
    .eq('company_id', companyId)
    .in('role', ['company_owner', 'company_admin', 'hospital_owner', 'hospital_admin'])
  return data || []
}

async function markNotificationOnce(
  supabase: any,
  subscriptionId: string,
  notificationType: string,
  periodEnd: string
): Promise<boolean> {
  const { data: existing } = await supabase
    .from('notification_sent_logs')
    .select('id')
    .eq('subscription_id', subscriptionId)
    .eq('notification_type', notificationType)
    .eq('period_end', periodEnd)
    .maybeSingle()
  if (existing) return false

  await supabase.from('notification_sent_logs').insert({
    subscription_id: subscriptionId,
    notification_type: notificationType,
    period_end: periodEnd,
  })
  return true
}

async function queueLifecycleEmail(
  supabase: any,
  companyId: string,
  notificationType: string,
  content: { subject: string; text: string; html: string },
  metadata: Record<string, unknown>
) {
  const admins = await getCompanyAdminsForNotify(supabase, companyId)
  for (const admin of admins) {
    await supabase.from('payment_notifications').insert({
      company_id: companyId,
      notification_type: notificationType,
      recipient_email: admin.email,
      recipient_name: admin.full_name,
      subject: content.subject,
      body_text: content.text,
      body_html: content.html,
      metadata,
      status: 'pending',
    })
  }
}

/**
 * 만료 2일전/당일 + 만료 2일후/1개월후(winback) 이메일 발송
 * 대상 제외 규칙:
 * - trial + billing_key + pending_plan_id: 자동전환 예정이므로 제외
 * - active + billing_key: 정기갱신 크론(processSubscriptionRenewals)이 만료 전 처리하므로 제외
 * - past_due: billing_key가 있어도 이미 결제가 한 번 실패한 상태라 제외하지 않음
 */
async function sendExpiryLifecycleEmails(supabase: any) {
  let emailsQueued = 0

  const preExpiryWindows: Array<{
    offsetDays: number
    trialType: string
    subType: string
    build: (variant: LifecycleVariant) => { subject: string; text: string; html: string }
    includeAlreadyExpiredToday: boolean
  }> = [
    {
      offsetDays: 2,
      trialType: 'trial_expiring_2d',
      subType: 'sub_expiring_2d',
      build: buildExpiring2dEmail,
      includeAlreadyExpiredToday: false,
    },
    {
      offsetDays: 0,
      trialType: 'trial_expiring_today',
      subType: 'sub_expiring_today',
      build: buildExpiringTodayEmail,
      // 크론이 08:00 KST에 도는데 만료 시각이 이미 지난 당일 건은 앞선 Task
      // (checkSubscriptionExpiry)가 이 실행 안에서 먼저 'expired'로 이미 바꿔놨을 수
      // 있다 - 상태값이 바뀌었다는 이유로 "당일" 메일을 놓치지 않도록 expired도 포함한다.
      includeAlreadyExpiredToday: true,
    },
  ]

  for (const w of preExpiryWindows) {
    const start = getKSTStartOfDay(w.offsetDays).toISOString()
    const end = getKSTStartOfDay(w.offsetDays + 1).toISOString()
    const trialStatuses = w.includeAlreadyExpiredToday ? ['trial', 'expired'] : ['trial']
    const subStatuses = w.includeAlreadyExpiredToday
      ? ['active', 'past_due', 'expired']
      : ['active', 'past_due']

    const { data: trialRows } = await supabase
      .from('company_subscriptions')
      .select(
        'id, company_id, status, trial_end_date, current_period_start, billing_key, pending_plan_id, companies!inner(is_active, withdrawn_at)'
      )
      .in('status', trialStatuses)
      .gte('trial_end_date', start)
      .lt('trial_end_date', end)
      .eq('companies.is_active', true)
      .is('companies.withdrawn_at', null)

    for (const sub of trialRows || []) {
      // trial 기원이 아닌데 우연히 trial_end_date가 남아있는 경우(과거 체험 이력이
      // 있던 유료 구독 등)는 아래 sub 분기가 담당하므로 건너뛴다.
      if (sub.current_period_start) continue
      if (sub.billing_key && sub.pending_plan_id) continue
      const isNew = await markNotificationOnce(supabase, sub.id, w.trialType, sub.trial_end_date)
      if (!isNew) continue
      const content = w.build('trial')
      await queueLifecycleEmail(supabase, sub.company_id, w.trialType, content, {
        subscription_id: sub.id,
      })
      emailsQueued++
    }

    const { data: subRows } = await supabase
      .from('company_subscriptions')
      .select(
        'id, company_id, status, current_period_end, billing_key, companies!inner(is_active, withdrawn_at)'
      )
      .in('status', subStatuses)
      .gte('current_period_end', start)
      .lt('current_period_end', end)
      .eq('companies.is_active', true)
      .is('companies.withdrawn_at', null)

    for (const sub of subRows || []) {
      if (sub.status === 'active' && sub.billing_key) continue
      const isNew = await markNotificationOnce(supabase, sub.id, w.subType, sub.current_period_end)
      if (!isNew) continue
      const content = w.build('subscription')
      await queueLifecycleEmail(supabase, sub.company_id, w.subType, content, {
        subscription_id: sub.id,
      })
      emailsQueued++
    }
  }

  // winback: 만료 2일후 / 1개월후 - 동일 본문, 1회성 10% 할인 그랜트를 함께 발급
  const winbackWindows: Array<{
    offsetDays: number
    timing: '2d' | '1m'
    trialType: string
    subType: string
  }> = [
    { offsetDays: -2, timing: '2d', trialType: 'trial_winback_2d', subType: 'sub_winback_2d' },
    { offsetDays: -30, timing: '1m', trialType: 'trial_winback_1m', subType: 'sub_winback_1m' },
  ]

  const { data: expiredRows } = await supabase
    .from('company_subscriptions')
    .select(
      'id, company_id, trial_end_date, current_period_end, current_period_start, companies!inner(is_active, withdrawn_at)'
    )
    .eq('status', 'expired')
    .eq('companies.is_active', true)
    .is('companies.withdrawn_at', null)

  for (const w of winbackWindows) {
    const startMs = getKSTStartOfDay(w.offsetDays).getTime()
    const endMs = getKSTStartOfDay(w.offsetDays + 1).getTime()

    for (const sub of expiredRows || []) {
      const isTrialOrigin = !sub.current_period_start
      const relevantEnd = isTrialOrigin ? sub.trial_end_date : sub.current_period_end
      if (!relevantEnd) continue
      const t = new Date(relevantEnd).getTime()
      if (t < startMs || t >= endMs) continue

      const notifType = isTrialOrigin ? w.trialType : w.subType
      const isNew = await markNotificationOnce(supabase, sub.id, notifType, relevantEnd)
      if (!isNew) continue

      // 1회성 10% 할인 그랜트 - 정기갱신 가격 잠금(company_subscription_price_locks)에는
      // 전혀 반영되지 않고, 엣지함수가 이번 청구액에만 곱해 쓴다.
      const token = crypto.randomBytes(24).toString('hex')
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await supabase.from('discount_grants').insert({
        company_id: sub.company_id,
        subscription_id: sub.id,
        token,
        discount_percent: 10,
        source: notifType,
        expires_at: expiresAt,
      })
      const discountUrl = `${PLAN_SELECT_URL}?discount=${token}`

      const content = buildWinbackEmail(isTrialOrigin ? 'trial' : 'subscription', w.timing, discountUrl)
      await queueLifecycleEmail(supabase, sub.company_id, notifType, content, {
        subscription_id: sub.id,
        discount_token: token,
      })
      emailsQueued++
    }
  }

  return { emailsQueued }
}

// 노션 32번: 만료 후 7일 뒤 회사 데이터 소프트 삭제 플래그 세팅 + 안내 메일.
// 테이블마다 deleted_at을 두지 않고 companies.data_deleted_at 하나로 관리한다
// (재구독 시 toss-billing-payment 엣지함수가 결제 성공 지점에서 이 값을 NULL로 복원).
async function softDeleteExpiredCompanyData(supabase: any) {
  const startMs = getKSTStartOfDay(-7).getTime()
  const endMs = getKSTStartOfDay(-6).getTime()

  const { data: expiredRows } = await supabase
    .from('company_subscriptions')
    .select(
      'id, company_id, trial_end_date, current_period_end, current_period_start, companies!inner(is_active, withdrawn_at, data_deleted_at)'
    )
    .eq('status', 'expired')
    .eq('companies.is_active', true)
    .is('companies.withdrawn_at', null)
    .is('companies.data_deleted_at', null)

  let companiesMarked = 0
  const processedCompanyIds = new Set<string>()

  for (const sub of expiredRows || []) {
    const isTrialOrigin = !sub.current_period_start
    const relevantEnd = isTrialOrigin ? sub.trial_end_date : sub.current_period_end
    if (!relevantEnd) continue
    const t = new Date(relevantEnd).getTime()
    if (t < startMs || t >= endMs) continue
    if (processedCompanyIds.has(sub.company_id)) continue
    processedCompanyIds.add(sub.company_id)

    const notifType = isTrialOrigin ? 'trial_data_deleted' : 'sub_data_deleted'
    const isNew = await markNotificationOnce(supabase, sub.id, notifType, relevantEnd)
    if (!isNew) continue

    const { error: flagError } = await supabase
      .from('companies')
      .update({ data_deleted_at: new Date().toISOString() })
      .eq('id', sub.company_id)
      .is('data_deleted_at', null)

    if (flagError) {
      console.error(`[DataDeletion] 삭제 플래그 세팅 실패 (company_id: ${sub.company_id}):`, flagError)
      continue
    }

    const content = buildDataDeletedEmail(isTrialOrigin ? 'trial' : 'subscription')
    await queueLifecycleEmail(supabase, sub.company_id, notifType, content, { subscription_id: sub.id })
    companiesMarked++
  }

  return { companiesMarked }
}

// 노션 32번: 소프트 삭제(data_deleted_at) 후 30일이 지나도 재구독하지 않은 회사의
// 실제 데이터를 하드 삭제한다. company_subscriptions/payment_*/company_activity_logs 등
// 결제·감사 기록과, churn_records 등 Funnely 자체 내부 분석 테이블은 대상에서 제외 -
// 자식 테이블부터 부모 순서로 지운다. 회사당 하나라도 실패하면 그 회사는 건너뛰고
// 다음 크론에서 재시도한다(부분 삭제 상태로 남기지 않기 위해 전부 성공해야 완료 처리).
const HARD_PURGE_TABLES = [
  'lead_status_logs',
  'reservation_date_logs',
  'lead_notification_logs',
  'lead_notification_queue',
  'sheet_sync_logs',
  'leads',
  'generated_reports',
  'landing_pages',
  'external_collection_pages',
  'sheet_sync_configs',
  'tracking_pixels',
  'form_templates',
  'privacy_policies',
  'performance_goals',
  'ad_accounts',
  'api_credentials',
  'phone_blacklist',
  'lead_statuses',
  'support_tickets',
  'company_custom_domains',
] as const

async function hardPurgeDeletedCompanyData(supabase: any) {
  const cutoff = getKSTStartOfDay(-30).toISOString()

  // data_purged_at IS NULL 게이트가 없으면 이미 삭제 완료된 회사도 data_deleted_at이
  // 그대로 남아있어 다음날부터 매일 다시 골라져 이미 빈 테이블에 DELETE를 반복
  // 실행하게 된다(타임라인 시뮬레이션 중 발견) - 완료 시 data_purged_at을 세팅해
  // 재선택되지 않도록 막는다.
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .not('data_deleted_at', 'is', null)
    .lt('data_deleted_at', cutoff)
    .is('data_purged_at', null)

  let companiesPurged = 0
  let companiesFailed = 0

  for (const company of companies || []) {
    let allSucceeded = true
    for (const table of HARD_PURGE_TABLES) {
      const { error } = await supabase.from(table).delete().eq('company_id', company.id)
      if (error) {
        console.error(`[DataPurge] ${table} 삭제 실패 (company_id: ${company.id}):`, error)
        allSucceeded = false
        break
      }
    }

    if (allSucceeded) {
      const { error: markError } = await supabase
        .from('companies')
        .update({ data_purged_at: new Date().toISOString() })
        .eq('id', company.id)
      if (markError) {
        // data_purged_at 마킹만 실패하면 다음 크론에서 이미 빈 테이블에 다시
        // DELETE를 시도할 뿐이라(멱등) 실패로 카운트하지 않고 로그만 남긴다.
        console.error(`[DataPurge] data_purged_at 마킹 실패 (company_id: ${company.id}):`, markError)
      }
      companiesPurged++
      console.log(`[DataPurge] 회사 데이터 하드 삭제 완료: ${company.id}`)
    } else {
      companiesFailed++
    }
  }

  return { companiesPurged, companiesFailed }
}

/**
 * Send lead digest emails grouped by company
 * Processes unsent notifications from lead_notification_queue
 */
async function sendLeadDigestEmails(supabase: any) {
  console.log('[Lead Digest] Starting email processing')

  const now = new Date().toISOString()

  // Query unsent notifications (retry_count < 3)
  const { data: pendingNotifications, error: queryError } = await supabase
    .from('lead_notification_queue')
    .select('*')
    .eq('sent', false)
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })

  if (queryError) {
    throw new Error(`Failed to query notification queue: ${queryError.message}`)
  }

  if (!pendingNotifications || pendingNotifications.length === 0) {
    console.log('[Lead Digest] No pending notifications')
    return {
      companies: 0,
      totalLeads: 0,
      emailsSent: 0,
      emailsFailed: 0,
      message: 'No pending notifications',
    }
  }

  console.log(`[Lead Digest] Found ${pendingNotifications.length} pending notifications`)

  // Group notifications by company
  const notificationsByCompany = new Map<string, any[]>()
  pendingNotifications.forEach((notification: any) => {
    const companyId = notification.company_id
    if (!notificationsByCompany.has(companyId)) {
      notificationsByCompany.set(companyId, [])
    }
    notificationsByCompany.get(companyId)!.push(notification)
  })

  let totalEmailsSent = 0
  let totalFailed = 0
  const resend = new Resend(process.env.RESEND_API_KEY)
  const dashboardUrl = process.env.NEXT_PUBLIC_DOMAIN
    ? process.env.NEXT_PUBLIC_DOMAIN.replace(/\/$/, '') + '/dashboard/leads'
    : 'https://funnely.co.kr/dashboard/leads'

  // Process each company's notifications
  for (const [companyId, notifications] of Array.from(notificationsByCompany.entries())) {
    const firstNotification = notifications[0]
    const recipientEmails = firstNotification.recipient_emails || []

    if (recipientEmails.length === 0) {
      console.log(`[Lead Digest] No recipient emails for company ${companyId}`)
      continue
    }

    // Get company name
    const { data: company } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .single()

    const companyName = company?.name || '회사'

    // Prepare digest content
    const leadItems = notifications.map((notif, index) => {
      const leadData = notif.lead_data
      return {
        number: index + 1,
        name: leadData.name,
        phone: leadData.phone ? decryptPhone(leadData.phone) : leadData.phone,
        email: leadData.email || '미입력',
        landingPageTitle: leadData.landing_page_title || '알 수 없음',
        deviceType: leadData.device_type || 'pc',
        createdAt: new Date(leadData.created_at).toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
        }),
      }
    })

    // Send digest email to each recipient
    let anyRecipientSucceeded = false
    const failedRecipients: string[] = []
    for (const recipientEmail of recipientEmails) {
      try {
        const htmlContent = generateDigestEmailHTML(companyName, leadItems, dashboardUrl)
        const textContent = generateDigestEmailText(companyName, leadItems, dashboardUrl)

        // 본문 생성기(generateDigestEmailHTML)는 escapeHtml을 쓰지만 제목은 원본
        // companyName(회원가입 시 자유입력)을 그대로 써서 개행문자로 헤더 인젝션이
        // 가능했다(81차 QA, 73차 백로그 항목 재확인).
        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Funnely <noreply@funnely.co.kr>',
          to: [recipientEmail],
          subject: `📊 [${companyName.replace(/[\r\n]/g, ' ')}] ${leadItems.length}건의 새로운 상담 신청`,
          html: htmlContent,
          text: textContent,
        })

        if (emailError) {
          throw emailError
        }

        console.log(
          `[Lead Digest] Email sent to ${recipientEmail} for company ${companyId} (${leadItems.length} leads)`
        )
        totalEmailsSent++
        anyRecipientSucceeded = true

        // Log successful send for each lead
        for (const notification of notifications) {
          await supabase.from('lead_notification_logs').insert({
            notification_queue_id: notification.id,
            company_id: companyId,
            lead_id: notification.lead_id,
            recipient_email: recipientEmail,
            sent_at: now,
            success: true,
            email_provider: 'resend',
          })
        }
      } catch (error) {
        console.error(`[Lead Digest] Failed to send to ${recipientEmail}:`, error)
        failedRecipients.push(recipientEmail)
        totalFailed++

        // Log failed send
        for (const notification of notifications) {
          await supabase.from('lead_notification_logs').insert({
            notification_queue_id: notification.id,
            company_id: companyId,
            lead_id: notification.lead_id,
            recipient_email: recipientEmail,
            sent_at: now,
            success: false,
            error_message: error instanceof Error ? error.message : 'Unknown error',
            email_provider: 'resend',
          })
        }
      }
    }

    if (failedRecipients.length === 0) {
      const notificationIds = notifications.map((n) => n.id)
      await supabase
        .from('lead_notification_queue')
        .update({ sent: true, sent_at: now })
        .in('id', notificationIds)
    } else if (anyRecipientSucceeded) {
      // 일부만 성공하면 배치 전체를 sent로 두지 않고, 실패한 수신자만 남겨 재시도한다.
      for (const notification of notifications) {
        await supabase
          .from('lead_notification_queue')
          .update({
            recipient_emails: failedRecipients,
            retry_count: (notification.retry_count || 0) + 1,
          })
          .eq('id', notification.id)
      }
      console.warn(
        `[Lead Digest] Partial send for company ${companyId}: ${failedRecipients.length} recipient(s) remaining`
      )
    } else {
      // 수신자 전원 발송 실패(예: Resend 장애) - 이전에는 이 경우에도 무조건
      // sent:true로 마킹해 재시도 없이 그날 알림이 영구 유실됐다. retry_count를
      // 컬럼 존재값 그대로 개별 증가시켜, 다음 크론 실행이 위 쿼리의
      // .lt('retry_count', 3) 조건에 따라 최대 3회까지 재시도하도록 한다
      // (67차 QA 확인).
      for (const notification of notifications) {
        await supabase
          .from('lead_notification_queue')
          .update({ retry_count: (notification.retry_count || 0) + 1 })
          .eq('id', notification.id)
      }
      console.error(
        `[Lead Digest] All recipients failed for company ${companyId} - will retry next run (retry_count incremented)`
      )
    }
  }

  return {
    companies: notificationsByCompany.size,
    totalLeads: pendingNotifications.length,
    emailsSent: totalEmailsSent,
    emailsFailed: totalFailed,
    message: `Processed ${notificationsByCompany.size} companies with ${pendingNotifications.length} total leads`,
  }
}

/**
 * 결제 관련 알림(결제완료/결제실패/구독취소/체험종료임박) 발송
 *
 * toss-billing-payment가 payment_notifications에
 * status:'pending'으로 insert만 하고, 이를 다시 읽어 실제 이메일로 보내는 코드가 프로젝트
 * 어디에도 없었다(신규 발견). subject/body_text는 이미 생성 시점에 채워져 있으므로 여기서는
 * 그대로 발송만 한다. body_html은 생성부에서 채우지 않으므로(항상 null) HTML 없이 텍스트
 * 메일로만 보낸다 - 이스케이프되지 않은 값을 HTML로 렌더링할 필요 자체가 없어 안전하다.
 *
 * 발송 실패 시 재시도 없이 status:'failed'로 영구 방치됐다(73차 QA) - 구독 만료 시
 * 대시보드 접근 자체가 막히므로 이 이메일이 고객이 사실을 알 수 있는 사실상 유일한
 * 채널인데, 일시적 장애만으로 영구 유실됐다. lead_notification_queue와 동일한
 * retry_count 패턴(최대 3회, 다음 크론에서 재시도)을 적용한다.
 */
async function sendPaymentNotificationEmails(supabase: any) {
  console.log('[Payment Notifications] Starting email processing')

  const { data: pending, error: queryError } = await supabase
    .from('payment_notifications')
    .select('*')
    .eq('status', 'pending')
    .lt('retry_count', 3)
    .order('created_at', { ascending: true })

  if (queryError) {
    throw new Error(`결제 알림 조회 실패: ${queryError.message}`)
  }

  if (!pending || pending.length === 0) {
    console.log('[Payment Notifications] No pending notifications')
    return {
      totalNotifications: 0,
      emailsSent: 0,
      emailsFailed: 0,
      message: 'No pending payment notifications',
    }
  }

  console.log(`[Payment Notifications] Found ${pending.length} pending notifications`)

  const resend = new Resend(process.env.RESEND_API_KEY)
  let emailsSent = 0
  let emailsFailed = 0

  for (const notif of pending) {
    try {
      // body_html이 채워져 있으면(노션 32번 이후 신규 발송 경로) HTML로도 함께 보낸다 -
      // 예전 발송 경로(구독 결제실패/갱신 등)는 body_html이 없어 계속 텍스트만 나간다.
      const { error: sendError } = await resend.emails.send({
        from: 'Funnely <noreply@funnely.co.kr>',
        to: [notif.recipient_email],
        subject: notif.subject,
        text: notif.body_text,
        ...(notif.body_html ? { html: notif.body_html } : {}),
      })

      if (sendError) {
        throw sendError
      }

      await supabase
        .from('payment_notifications')
        .update({ status: 'sent', sent_at: new Date().toISOString() })
        .eq('id', notif.id)

      emailsSent++
      console.log(`[Payment Notifications] Sent to ${notif.recipient_email} (${notif.notification_type})`)
    } catch (error) {
      console.error(`[Payment Notifications] Failed to send to ${notif.recipient_email}:`, error)

      const nextRetryCount = (notif.retry_count || 0) + 1
      await supabase
        .from('payment_notifications')
        .update({
          // 3회 미만이면 status는 pending으로 유지해 다음 크론이 위 쿼리(.lt('retry_count', 3))로
          // 다시 집어가도록 하고, 3회를 채우면 그때 비로소 최종 실패로 마킹한다.
          status: nextRetryCount >= 3 ? 'failed' : 'pending',
          retry_count: nextRetryCount,
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', notif.id)

      emailsFailed++
    }
  }

  return {
    totalNotifications: pending.length,
    emailsSent,
    emailsFailed,
    message: `Processed ${pending.length} payment notifications`,
  }
}

/**
 * email_logs에 pending으로 남은 트랜잭션 메일(티켓 답변 등)을 재발송한다.
 * sendAndLogEmail이 첫 실패를 pending으로 남겨 두므로, 이 크론이 최대 MAX_RETRIES회까지 재시도한다.
 */
async function retryPendingTransactionalEmails(supabase: any) {
  const { data: pending, error: queryError } = await supabase
    .from('email_logs')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })
    .limit(50)

  if (queryError) {
    throw new Error(`email_logs 조회 실패: ${queryError.message}`)
  }

  if (!pending || pending.length === 0) {
    return { total: 0, emailsSent: 0, emailsFailed: 0, message: 'No pending transactional emails' }
  }

  const resend = new Resend(process.env.RESEND_API_KEY)
  let emailsSent = 0
  let emailsFailed = 0

  for (const log of pending) {
    const retryCount = Number(log.metadata?.retry_count || 0)
    if (retryCount >= MAX_RETRIES) {
      await supabase.from('email_logs').update({ status: 'failed' }).eq('id', log.id)
      emailsFailed++
      continue
    }

    try {
      const { error: sendError } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: [log.to_email],
        subject: log.subject,
        html: log.body_html,
        text: log.metadata?.text || undefined,
      })
      if (sendError) throw sendError

      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', log.id)
      emailsSent++
    } catch (error) {
      const nextRetry = retryCount + 1
      await supabase
        .from('email_logs')
        .update({
          status: nextRetry >= MAX_RETRIES ? 'failed' : 'pending',
          error_message: error instanceof Error ? error.message : 'Unknown error',
          metadata: { ...(log.metadata || {}), retry_count: nextRetry },
        })
        .eq('id', log.id)
      emailsFailed++
    }
  }

  return {
    total: pending.length,
    emailsSent,
    emailsFailed,
    message: `Processed ${pending.length} pending transactional emails`,
  }
}

/**
 * Disable landing pages with expired timers
 * Finds pages where timer_deadline has passed and disables them
 */
async function disableExpiredTimers(supabase: any) {
  console.log('[Timer Expiry] Starting expired timer check')

  const now = new Date().toISOString()

  // Find expired landing pages (include company_id for notifications)
  const { data: expiredPages, error: selectError } = await supabase
    .from('landing_pages')
    .select('id, title, timer_deadline, company_id, slug')
    .eq('timer_enabled', true)
    .eq('timer_auto_update', false)
    .eq('is_active', true)
    .lt('timer_deadline', now)

  if (selectError) {
    throw new Error(`Failed to query expired landing pages: ${selectError.message}`)
  }

  if (!expiredPages || expiredPages.length === 0) {
    console.log('[Timer Expiry] No expired timers found')
    return {
      checked: 0,
      disabled: 0,
      landingPages: [],
      message: 'No expired timers',
    }
  }

  console.log(`[Timer Expiry] Found ${expiredPages.length} expired landing pages`)

  // Disable expired pages
  const expiredIds = expiredPages.map((page: any) => page.id)

  const { error: updateError } = await supabase
    .from('landing_pages')
    .update({ is_active: false, status: 'draft' })
    .in('id', expiredIds)

  if (updateError) {
    throw new Error(`Failed to disable expired landing pages: ${updateError.message}`)
  }

  console.log(`[Timer Expiry] Disabled ${expiredPages.length} landing pages`)

  // Send notifications for each disabled landing page
  for (const page of expiredPages) {
    try {
      const deadlineStr = new Date(page.timer_deadline).toLocaleString('ko-KR', {
        timeZone: 'Asia/Seoul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

      await supabase.from('notifications').insert({
        company_id: page.company_id,
        title: '랜딩페이지 타이머 만료로 비활성화',
        message: `"${page.title}" 랜딩페이지의 타이머가 ${deadlineStr}에 만료되어 자동으로 비활성화되었습니다. 다시 활성화하려면 새로운 마감 날짜를 설정해주세요.`,
        type: 'landing_page_timer_expired',
        metadata: { landing_page_id: page.id, slug: page.slug },
      })

      console.log(`[Timer Expiry] Notification sent for landing page: ${page.id} (${page.title})`)
    } catch (notifError) {
      console.error(`[Timer Expiry] Failed to create notification for page ${page.id}:`, notifError)
    }
  }

  return {
    checked: expiredPages.length,
    disabled: expiredPages.length,
    landingPages: expiredPages.map((page: any) => ({
      id: page.id,
      title: page.title,
      deadline: page.timer_deadline,
    })),
    message: `Disabled ${expiredPages.length} expired landing pages`,
  }
}

// notifications 테이블에 보존/정리 정책이 없어 리드가 생성될 때마다(new_lead) 무한히
// 쌓였다 - 알림 목록/뱃지/모두읽음 쿼리가 전부 페이지네이션 없이 전체 조회라 회사가
// 오래 사용할수록 계속 느려진다(80차 QA). notification_reads는 notification_id를
// ON DELETE CASCADE로 참조하므로 notifications만 지워도 함께 정리된다.
async function cleanupOldNotifications(supabase: any) {
  const cutoff = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data: deleted, error } = await supabase
    .from('notifications')
    .delete()
    .lt('created_at', cutoff)
    .select('id')

  if (error) {
    throw new Error(`Failed to clean up old notifications: ${error.message}`)
  }

  return {
    deleted: deleted?.length || 0,
    cutoff,
    message: `Deleted ${deleted?.length || 0} notifications older than 90 days`,
  }
}

/**
 * 어드민 리포트(회원가입/무료체험/결제/매출/탈퇴/구독취소/문의) 중 하나라도
 * 전날(KST) 발생 건이 있으면 요약 메일을 보낸다. 노션 QA 18번 항목 요청대로
 * 활동이 전혀 없는 날은 조용히 스킵한다(매일 빈 메일이 오는 것을 방지).
 * 집계 기준은 /admin/reports가 쓰는 analytics/daily 쿼리와 동일하게 맞춘다
 * (특히 company_subscriptions.status는 'canceled'가 아니라 'cancelled').
 */
async function sendAdminReportDigest(supabase: any) {
  const rangeStart = getKSTStartOfDay(-1).toISOString()
  const rangeEnd = getKSTStartOfDay(0).toISOString()
  const reportDateLabel = toKSTDateStr(getKSTStartOfDay(-1))

  const [signupsRes, trialsRes, paymentsRes, withdrawalsRes, cancellationsRes, ticketsRes] =
    await Promise.all([
      supabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd)
        .is('withdrawn_at', null),
      supabase
        .from('company_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'trial')
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd),
      supabase
        .from('payment_transactions')
        .select('total_amount')
        .eq('status', 'success')
        .gte('approved_at', rangeStart)
        .lt('approved_at', rangeEnd),
      supabase
        .from('companies')
        .select('id', { count: 'exact', head: true })
        .gte('withdrawn_at', rangeStart)
        .lt('withdrawn_at', rangeEnd),
      supabase
        .from('company_subscriptions')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'cancelled')
        .gte('updated_at', rangeStart)
        .lt('updated_at', rangeEnd),
      supabase
        .from('support_tickets')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', rangeStart)
        .lt('created_at', rangeEnd),
    ])

  for (const res of [signupsRes, trialsRes, paymentsRes, withdrawalsRes, cancellationsRes, ticketsRes]) {
    if (res.error) throw res.error
  }

  const signups = signupsRes.count || 0
  const trials = trialsRes.count || 0
  const payments = (paymentsRes.data || []).length
  const revenue = (paymentsRes.data || []).reduce(
    (sum: number, r: { total_amount: number }) => sum + (r.total_amount || 0),
    0
  )
  const withdrawals = withdrawalsRes.count || 0
  const cancellations = cancellationsRes.count || 0
  const tickets = ticketsRes.count || 0

  const totalActivity = signups + trials + payments + withdrawals + cancellations + tickets

  if (totalActivity === 0) {
    return { sent: false, reason: 'no_activity', reportDate: reportDateLabel }
  }

  const [, monthStr, dayStr] = reportDateLabel.split('-')
  const dateTitle = `${Number(monthStr)}월 ${Number(dayStr)}일`
  const dashboardUrl = process.env.NEXT_PUBLIC_DOMAIN
    ? process.env.NEXT_PUBLIC_DOMAIN.replace(/\/$/, '') + '/admin/reports'
    : 'https://funnely.co.kr/admin/reports'

  const metrics = [
    { emoji: '👤', label: '회원가입', value: `${signups}건` },
    { emoji: '🎁', label: '무료체험', value: `${trials}건` },
    { emoji: '💳', label: '결제', value: `${payments}건` },
    { emoji: '💰', label: '매출', value: `${revenue.toLocaleString('ko-KR')}원` },
    { emoji: '📤', label: '탈퇴', value: `${withdrawals}건` },
    { emoji: '🚫', label: '구독취소', value: `${cancellations}건` },
    { emoji: '💬', label: '문의', value: `${tickets}건` },
  ]

  const htmlRows = metrics
    .map(
      (m) => `
      <div class="info-row">
        <div class="label">${m.emoji} ${m.label}</div>
        <div class="value">${m.value}</div>
      </div>`
    )
    .join('')

  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .header h1 { margin: 0 0 10px 0; font-size: 22px; font-weight: 700; }
    .header p { margin: 0; font-size: 14px; opacity: 0.95; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
    .info-row { padding: 12px 0; border-bottom: 1px solid #f3f4f6; display: flex; justify-content: space-between; align-items: center; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #374151; font-size: 14px; }
    .value { color: #111827; font-size: 16px; font-weight: 700; }
    .button { display: inline-block; background: #667eea; color: white !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 24px; text-align: center; }
    .footer { text-align: center; padding: 20px; color: #9ca3af; font-size: 12px; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 ${dateTitle} 일일 리포트</h1>
      <p>어제 하루 퍼널리 서비스 현황입니다</p>
    </div>
    <div class="content">
      ${htmlRows}
      <div style="text-align: center;">
        <a href="${dashboardUrl}" class="button">어드민 리포트에서 자세히 보기 →</a>
      </div>
    </div>
    <div class="footer">
      <p>이 이메일은 전날 신규 활동이 1건 이상 있을 때 매일 아침 자동 발송됩니다.</p>
    </div>
  </div>
</body>
</html>`

  const textContent = `📊 ${dateTitle} 일일 리포트\n\n${metrics
    .map((m) => `${m.emoji} ${m.label}: ${m.value}`)
    .join('\n')}\n\n어드민 리포트: ${dashboardUrl}`

  const REPORT_DIGEST_RECIPIENTS = ['munong2@gmail.com', '1989comp@gmail.com']
  const resend = new Resend(process.env.RESEND_API_KEY)
  let emailsSent = 0
  let emailsFailed = 0

  for (const recipient of REPORT_DIGEST_RECIPIENTS) {
    try {
      const { error } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: [recipient],
        subject: `📊 [Funnely 어드민] ${dateTitle} 리포트 - 신규 ${totalActivity}건`,
        html: htmlContent,
        text: textContent,
      })
      if (error) throw error
      emailsSent++
    } catch (error) {
      console.error(`[Admin Report Digest] Failed to send to ${recipient}:`, error)
      emailsFailed++
    }
  }

  return {
    sent: emailsSent > 0,
    reportDate: reportDateLabel,
    counts: { signups, trials, payments, revenue, withdrawals, cancellations, tickets },
    emailsSent,
    emailsFailed,
  }
}

/**
 * 결제 정식 오픈 알림 신청자 중 아직 관리자에게 보고되지 않은 건만 요약메일로 발송한다.
 * (노션 31번 항목 후속 - 신규 신청이 없으면 스킵해 매일 같은 내용의 스팸이 되지 않게 한다)
 */
async function sendPaymentLaunchNotifyDigest(supabase: any) {
  const { data: pending, error } = await supabase
    .from('payment_launch_notify_signups')
    .select('id, email, created_at')
    .is('admin_digest_sent_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error
  if (!pending || pending.length === 0) {
    return { sent: false, reason: 'no_new_signups' }
  }

  const dashboardUrl = process.env.NEXT_PUBLIC_DOMAIN
    ? process.env.NEXT_PUBLIC_DOMAIN.replace(/\/$/, '') + '/admin/payment-launch-notify'
    : 'https://funnely.co.kr/admin/payment-launch-notify'

  const listHtml = pending
    .map((row: { email: string }) => `<li>${escapeHtml(row.email)}</li>`)
    .join('')
  const listText = pending.map((row: { email: string }) => `- ${row.email}`).join('\n')

  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; background-color: #f9fafb; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 18px; font-weight: 700; }
    .content { background: #ffffff; padding: 24px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
    ul { padding-left: 20px; color: #111827; font-size: 14px; line-height: 1.8; }
    .button { display: inline-block; background: #d97706; color: white !important; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header"><h1>💳 결제 오픈 알림 신규 신청 ${pending.length}건</h1></div>
    <div class="content">
      <ul>${listHtml}</ul>
      <a href="${dashboardUrl}" class="button">전체 목록 보기 →</a>
    </div>
  </div>
</body>
</html>`

  const textContent = `결제 오픈 알림 신규 신청 ${pending.length}건\n\n${listText}\n\n전체 목록: ${dashboardUrl}`

  const NOTIFICATION_RECIPIENTS = ['munong2@gmail.com', '1989comp@gmail.com']
  const resend = new Resend(process.env.RESEND_API_KEY)
  let emailsSent = 0
  let emailsFailed = 0

  for (const recipient of NOTIFICATION_RECIPIENTS) {
    try {
      const { error: sendError } = await resend.emails.send({
        from: FROM_ADDRESS,
        to: [recipient],
        subject: `💳 [Funnely 어드민] 결제 오픈 알림 신규 신청 ${pending.length}건`,
        html: htmlContent,
        text: textContent,
      })
      if (sendError) throw sendError
      emailsSent++
    } catch (sendError) {
      console.error(`[Payment Launch Notify Digest] Failed to send to ${recipient}:`, sendError)
      emailsFailed++
    }
  }

  if (emailsSent > 0) {
    const ids = pending.map((row: { id: string }) => row.id)
    await supabase
      .from('payment_launch_notify_signups')
      .update({ admin_digest_sent_at: new Date().toISOString() })
      .in('id', ids)
  }

  return { sent: emailsSent > 0, newSignups: pending.length, emailsSent, emailsFailed }
}

// Generate HTML email for digest
function generateDigestEmailHTML(
  companyName: string,
  leads: Array<{
    number: number
    name: string
    phone: string
    email: string
    landingPageTitle: string
    deviceType: string
    createdAt: string
  }>,
  dashboardUrl: string
): string {
  const currentTime = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const deviceIcons = {
    pc: '🖥️',
    mobile: '📱',
    tablet: '📲',
  }

  const leadsHTML = leads
    .map(
      (lead) => `
    <tr style="border-bottom: 1px solid #e5e7eb;">
      <td style="padding: 16px; text-align: center; font-weight: 600; color: #6366f1;">${lead.number}</td>
      <td style="padding: 16px;">
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${escapeHtml(lead.name)}</div>
        <div style="color: #6b7280; font-size: 14px;">${escapeHtml(lead.phone)}</div>
      </td>
      <td style="padding: 16px; color: #374151;">${escapeHtml(lead.email)}</td>
      <td style="padding: 16px; color: #374151;">${escapeHtml(lead.landingPageTitle)}</td>
      <td style="padding: 16px; text-align: center;">${deviceIcons[lead.deviceType as keyof typeof deviceIcons] || deviceIcons.pc}</td>
      <td style="padding: 16px; color: #6b7280; font-size: 14px;">${escapeHtml(lead.createdAt)}</td>
    </tr>
  `
    )
    .join('')

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>상담 신청 알림</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" style="max-width: 800px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 700;">📊 상담 신청 알림</h1>
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 16px;">${escapeHtml(companyName)}</p>
            </td>
          </tr>

          <!-- Summary -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <div style="background-color: #f0f9ff; border-left: 4px solid #6366f1; padding: 16px 20px; border-radius: 8px; margin-bottom: 24px;">
                <p style="margin: 0; font-size: 16px; color: #1e40af;">
                  <strong>${currentTime}</strong> 기준<br>
                  새로운 상담 신청이 <strong style="color: #6366f1; font-size: 24px;">${leads.length}건</strong> 접수되었습니다.
                </p>
              </div>

              <!-- Leads Table -->
              <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                <thead>
                  <tr style="background-color: #f9fafb;">
                    <th style="padding: 16px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; width: 60px;">순번</th>
                    <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">고객명/연락처</th>
                    <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">이메일</th>
                    <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">랜딩페이지</th>
                    <th style="padding: 16px; text-align: center; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; width: 60px;">기기</th>
                    <th style="padding: 16px; text-align: left; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">신청일시</th>
                  </tr>
                </thead>
                <tbody>
                  ${leadsHTML}
                </tbody>
              </table>
            </td>
          </tr>

          <!-- CTA Button -->
          <tr>
            <td style="padding: 0 32px 32px 32px; text-align: center;">
              <a href="${dashboardUrl}" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 16px 48px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                대시보드에서 상세 확인하기 →
              </a>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #f9fafb; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 14px;">
                이 이메일은 <strong>${escapeHtml(companyName)}</strong>의 리드 알림 시스템에서 자동 발송되었습니다.<br>
                매일 오전 8시에 새로운 상담 신청을 정리하여 보내드립니다.
              </p>
              <p style="margin: 16px 0 0 0; color: #9ca3af; font-size: 12px;">
                Powered by <strong>Funnely</strong>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `
}

// Generate plain text email for digest
function generateDigestEmailText(
  companyName: string,
  leads: Array<{
    number: number
    name: string
    phone: string
    email: string
    landingPageTitle: string
    deviceType: string
    createdAt: string
  }>,
  dashboardUrl: string
): string {
  const currentTime = new Date().toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })

  const leadsText = leads
    .map(
      (lead) => `
${lead.number}. ${lead.name} (${lead.phone})
   이메일: ${lead.email}
   랜딩페이지: ${lead.landingPageTitle}
   기기: ${lead.deviceType}
   신청일시: ${lead.createdAt}
`
    )
    .join('\n')

  return `
📊 [${companyName}] 상담 신청 알림

${currentTime} 기준
새로운 상담 신청이 ${leads.length}건 접수되었습니다.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${leadsText}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

대시보드에서 상세 정보를 확인하세요:
${dashboardUrl}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
이 이메일은 ${companyName}의 리드 알림 시스템에서 자동 발송되었습니다.
매일 오전 8시에 새로운 상담 신청을 정리하여 보내드립니다.

Powered by Funnely
  `
}
