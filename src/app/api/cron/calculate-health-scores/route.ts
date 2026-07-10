import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { calculateHealthScore, toCustomerHealthScoreRow } from '@/lib/health/calculateHealthScore'

/**
 * GET /api/cron/calculate-health-scores
 * Daily batch job for calculating all company health scores
 *
 * Security: Vercel Cron requests include authorization header
 */
export async function GET(request: NextRequest) {
  try {
    // 1. Verify this is a Vercel Cron request
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[Cron] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Cron] Starting daily health score calculation...')

    // 2. Initialize Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 3. Get all active companies
    // companies has no 'status' column — it's tracked via the 'is_active' boolean.
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('is_active', true)

    if (companiesError) {
      console.error('[Cron] Failed to fetch companies:', companiesError)
      return NextResponse.json(
        { error: 'Failed to fetch companies' },
        { status: 500 }
      )
    }

    console.log(`[Cron] Found ${companies?.length || 0} active companies`)

    // 4. Calculate health score for each company
    const results = []
    const errors = []

    for (const company of companies || []) {
      try {
        // Calculate score
        const healthScore = await calculateHealthScore(company.id, supabase)
        const row = toCustomerHealthScoreRow(company.id, healthScore)

        // Check if today's score already exists
        // Real table name is 'customer_health_scores', not 'health_scores'.
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)

        const { data: existingScore } = await supabase
          .from('customer_health_scores')
          .select('id')
          .eq('company_id', company.id)
          .gte('calculated_at', today.toISOString())
          .lt('calculated_at', tomorrow.toISOString())
          .single()

        if (existingScore) {
          // Update existing score
          const { error: updateError } = await supabase
            .from('customer_health_scores')
            .update(row)
            .eq('id', existingScore.id)

          if (updateError) {
            throw updateError
          }

          results.push({
            companyId: company.id,
            companyName: company.name,
            overallScore: healthScore.overall_score,
            healthStatus: healthScore.health_status,
            action: 'updated',
          })
        } else {
          // Insert new score
          const { error: insertError } = await supabase
            .from('customer_health_scores')
            .insert(row)

          if (insertError) {
            throw insertError
          }

          results.push({
            companyId: company.id,
            companyName: company.name,
            overallScore: healthScore.overall_score,
            healthStatus: healthScore.health_status,
            action: 'created',
          })
        }

        console.log(
          `[Cron] ✓ ${company.name}: ${healthScore.overall_score} (${healthScore.health_status})`
        )
      } catch (error) {
        console.error(
          `[Cron] ✗ Error calculating health score for ${company.id}:`,
          error
        )
        errors.push({
          companyId: company.id,
          companyName: company.name,
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    // 5. Return results
    const response = {
      success: true,
      timestamp: new Date().toISOString(),
      calculated: results.length,
      errors: errors.length,
      results,
      errorDetails: errors.length > 0 ? errors : undefined,
    }

    console.log(
      `[Cron] Completed: ${results.length} calculated, ${errors.length} errors`
    )

    return NextResponse.json(response)
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
