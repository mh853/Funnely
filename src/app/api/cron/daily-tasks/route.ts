import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'
import { calculateMRR, calculateARR } from '@/lib/revenue/calculations'
import { calculateHealthScore } from '@/lib/health/calculateHealthScore'
import {
  fetchSheetData,
  parseSheetToLeads,
  ColumnMapping,
} from '@/lib/google-sheets'
import { detectGrowthOpportunities } from '@/lib/growth/opportunityDetection'
import type { Subscription } from '@/types/revenue'
import { Resend } from 'resend'

/**
 * Unified daily tasks cron job
 * Consolidates all daily operations into single cron job
 *
 * Vercel Cron: 0 23 * * * (UTC 23:00 = KST 08:00 - Free Plan limitation: 1 cron only)
 *
 * All tasks run sequentially at 23:00 UTC (08:00 KST):
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

    // Task 6: Disable Expired Landing Page Timers
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
  // Fetch all active subscriptions
  const { data: activeSubscriptions, error: subsError } = await supabase
    .from('company_subscriptions')
    .select(
      `
      id,
      company_id,
      status,
      billing_cycle,
      subscription_plans:plan_id (
        id,
        name,
        price_monthly,
        price_yearly
      )
    `
    )
    .eq('status', 'active')

  if (subsError) {
    throw new Error(`Failed to fetch subscriptions: ${subsError.message}`)
  }

  // Group subscriptions by company
  const companySubscriptionsMap = new Map<string, any[]>()
  activeSubscriptions?.forEach((sub: any) => {
    const existing = companySubscriptionsMap.get(sub.company_id) || []
    companySubscriptionsMap.set(sub.company_id, [...existing, sub])
  })

  // Calculate MRR/ARR for each company
  const revenueMetrics = []
  const today = new Date().toISOString()

  for (const [companyId, companySubs] of Array.from(
    companySubscriptionsMap.entries()
  )) {
    const subscriptions: Subscription[] = companySubs.map((sub: any) => {
      const plan = sub.subscription_plans
      const amount =
        sub.billing_cycle === 'yearly'
          ? plan.price_yearly || plan.price_monthly * 12
          : plan.price_monthly

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

    revenueMetrics.push({
      company_id: companyId,
      mrr,
      arr,
      mrr_growth_rate: null,
      arr_growth_rate: null,
      plan_type: firstSub.plan_type,
      billing_cycle: firstSub.billing_cycle,
      calculated_at: today,
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
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name')
    .eq('status', 'active')

  if (companiesError) {
    throw new Error(`Failed to fetch companies: ${companiesError.message}`)
  }

  const results = []
  const errors = []

  for (const company of companies || []) {
    try {
      const healthScore = await calculateHealthScore(company.id, supabase)

      // Check if today's score exists
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const tomorrow = new Date(today)
      tomorrow.setDate(tomorrow.getDate() + 1)

      const { data: existingScore } = await supabase
        .from('health_scores')
        .select('id')
        .eq('company_id', company.id)
        .gte('calculated_at', today.toISOString())
        .lt('calculated_at', tomorrow.toISOString())
        .single()

      if (existingScore) {
        // Update existing score
        await supabase
          .from('health_scores')
          .update({
            overall_score: healthScore.overall_score,
            engagement_score: healthScore.engagement_score,
            product_usage_score: healthScore.product_usage_score,
            support_score: healthScore.support_score,
            payment_score: healthScore.payment_score,
            health_status: healthScore.health_status,
            risk_factors: healthScore.risk_factors,
            recommendations: healthScore.recommendations,
            calculated_at: new Date().toISOString(),
          })
          .eq('id', existingScore.id)

        results.push({
          companyId: company.id,
          action: 'updated',
          score: healthScore.overall_score,
        })
      } else {
        // Insert new score
        await supabase.from('health_scores').insert({
          company_id: company.id,
          overall_score: healthScore.overall_score,
          engagement_score: healthScore.engagement_score,
          product_usage_score: healthScore.product_usage_score,
          support_score: healthScore.support_score,
          payment_score: healthScore.payment_score,
          health_status: healthScore.health_status,
          risk_factors: healthScore.risk_factors,
          recommendations: healthScore.recommendations,
          calculated_at: new Date().toISOString(),
        })

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
  const { data: configs, error: configError } = await supabase
    .from('sheet_sync_configs')
    .select('*')
    .eq('is_active', true)

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

      // Parse and filter new leads
      const columnMapping = config.column_mapping as ColumnMapping
      const sheetLeads = parseSheetToLeads(rows, columnMapping)

      const { data: existingLeads } = await supabase
        .from('leads')
        .select('phone_hash')
        .eq('company_id', config.company_id)

      const existingHashes = new Set(
        existingLeads?.map((l: any) => l.phone_hash) || []
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

        const { data: inserted } = await supabase
          .from('leads')
          .insert(leadsToInsert)
          .select('id')

        importedCount = inserted?.length || 0
      }

      // Update sync time
      await supabase
        .from('sheet_sync_configs')
        .update({ last_synced_at: now.toISOString() })
        .eq('id', config.id)

      // Log sync result
      await supabase.from('sheet_sync_logs').insert({
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
      })
    } catch (syncError: any) {
      await supabase.from('sheet_sync_logs').insert({
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

  return {
    synced: results.filter((r) => r.status === 'success').length,
    results,
  }
}

/**
 * Check subscription expiry and send notifications
 * Integrated from /api/cron/check-subscriptions
 */
async function checkSubscriptionExpiry(supabase: any) {
  const now = new Date()
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

  console.log(`[Subscription] 구독 체크 시작: ${now.toISOString()}`)

  // 1. 만료 7일 전 구독 찾기 (active 또는 trial 상태)
  const { data: expiringSoon, error: expiringError } = await supabase
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
    .in('status', ['active', 'trial'])
    .gte('current_period_end', now.toISOString())
    .lte('current_period_end', sevenDaysLater.toISOString())

  if (expiringError) {
    throw new Error(`만료 예정 구독 조회 실패: ${expiringError.message}`)
  }

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
        link: '/dashboard/subscription',
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

  // 3. 만료된 구독 찾기
  const { data: expiredSubs, error: expiredError } = await supabase
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
    .in('status', ['active', 'trial', 'past_due'])
    .lt('current_period_end', now.toISOString())

  if (expiredError) {
    throw new Error(`만료된 구독 조회 실패: ${expiredError.message}`)
  }

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
      // Grace period 없거나 종료 → 'expired'로 변경
      const { error: updateError } = await supabase
        .from('company_subscriptions')
        .update({ status: 'expired' })
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
        await supabase.from('notifications').insert({
          company_id: sub.company_id,
          title: `구독이 만료되었습니다`,
          message: `${(sub.companies as any)?.name || '회사'}의 구독이 만료되어 대시보드 접근이 제한됩니다. 서비스를 계속 이용하려면 플랜을 선택해주세요.`,
          type: 'subscription_expired',
          link: '/dashboard/subscription',
        })

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
        phone: leadData.phone,
        email: leadData.email || '미입력',
        landingPageTitle: leadData.landing_page_title || '알 수 없음',
        deviceType: leadData.device_type || 'pc',
        createdAt: new Date(leadData.created_at).toLocaleString('ko-KR', {
          timeZone: 'Asia/Seoul',
        }),
      }
    })

    // Send digest email to each recipient
    for (const recipientEmail of recipientEmails) {
      try {
        const htmlContent = generateDigestEmailHTML(companyName, leadItems, dashboardUrl)
        const textContent = generateDigestEmailText(companyName, leadItems, dashboardUrl)

        const { data: emailData, error: emailError } = await resend.emails.send({
          from: 'Funnely <noreply@funnely.co.kr>',
          to: [recipientEmail],
          subject: `📊 [${companyName}] ${leadItems.length}건의 새로운 상담 신청`,
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

    // Mark all notifications as sent
    const notificationIds = notifications.map((n) => n.id)
    await supabase
      .from('lead_notification_queue')
      .update({ sent: true, sent_at: now })
      .in('id', notificationIds)
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
 * Disable landing pages with expired timers
 * Finds pages where timer_deadline has passed and disables them
 */
async function disableExpiredTimers(supabase: any) {
  console.log('[Timer Expiry] Starting expired timer check')

  const now = new Date().toISOString()

  // Find expired landing pages
  const { data: expiredPages, error: selectError } = await supabase
    .from('landing_pages')
    .select('id, title, timer_deadline')
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
    .update({ is_active: false })
    .in('id', expiredIds)

  if (updateError) {
    throw new Error(`Failed to disable expired landing pages: ${updateError.message}`)
  }

  console.log(`[Timer Expiry] Disabled ${expiredPages.length} landing pages`)

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
        <div style="font-weight: 600; color: #111827; margin-bottom: 4px;">${lead.name}</div>
        <div style="color: #6b7280; font-size: 14px;">${lead.phone}</div>
      </td>
      <td style="padding: 16px; color: #374151;">${lead.email}</td>
      <td style="padding: 16px; color: #374151;">${lead.landingPageTitle}</td>
      <td style="padding: 16px; text-align: center;">${deviceIcons[lead.deviceType as keyof typeof deviceIcons] || deviceIcons.pc}</td>
      <td style="padding: 16px; color: #6b7280; font-size: 14px;">${lead.createdAt}</td>
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
              <p style="margin: 8px 0 0 0; color: #e0e7ff; font-size: 16px;">${companyName}</p>
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
                이 이메일은 <strong>${companyName}</strong>의 리드 알림 시스템에서 자동 발송되었습니다.<br>
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
