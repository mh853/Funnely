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
import type { Subscription } from '@/types/revenue'

/**
 * Unified daily tasks cron job
 * Consolidates revenue calculation, health scores, and sheets sync
 *
 * Vercel Cron: 0 1 * * * (1 AM daily - Free Plan limitation)
 *
 * All tasks run sequentially at 1 AM:
 * - Calculate revenue (MRR/ARR)
 * - Calculate customer health scores
 * - Sync Google Sheets
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

    console.log('[Cron] Starting daily tasks at 1 AM')

    // Supabase client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

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
