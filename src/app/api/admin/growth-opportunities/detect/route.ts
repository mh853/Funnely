import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { detectGrowthOpportunities } from '@/lib/growth/opportunityDetection'

/**
 * POST /api/admin/growth-opportunities/detect
 * Manually trigger growth opportunity detection for all companies
 */
export async function POST(request: NextRequest) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // TODO: Add proper RBAC permission check for MANAGE_GROWTH_OPPORTUNITIES

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('[Growth Detection] Starting manual detection...')
    const result = await detectGrowthOpportunities(supabase)

    if (!result.success) {
      console.error('[Growth Detection] Errors:', result.errors)
      return NextResponse.json(
        {
          message: 'Detection completed with errors',
          ...result,
        },
        { status: 207 } // Multi-Status
      )
    }

    console.log('[Growth Detection] Detection successful:', {
      detected: result.detected,
      updated: result.updated,
      dismissed: result.dismissed,
    })

    return NextResponse.json({
      message: 'Growth opportunities detected successfully',
      ...result,
    })
  } catch (error) {
    console.error('[Growth Detection] API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
