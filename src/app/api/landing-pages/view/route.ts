import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

// Service role client for bypassing RLS
function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// Device type detection from User-Agent
type DeviceType = 'desktop' | 'mobile' | 'tablet'

function getDeviceType(userAgent: string | null): DeviceType {
  if (!userAgent) return 'desktop'

  const ua = userAgent.toLowerCase()

  // Tablet detection (must come before mobile check)
  if (
    /ipad|tablet|playbook|silk|(android(?!.*mobile))/i.test(ua)
  ) {
    return 'tablet'
  }

  // Mobile detection
  if (
    /mobile|iphone|ipod|android.*mobile|windows phone|blackberry|bb10|mini|webos|opera mini|opera mobi/i.test(ua)
  ) {
    return 'mobile'
  }

  return 'desktop'
}

// Get today's date in YYYY-MM-DD format (KST)
function getTodayDateKST(): string {
  const now = new Date()
  // Convert to KST (UTC+9)
  const kstOffset = 9 * 60 * 60 * 1000
  const kstDate = new Date(now.getTime() + kstOffset)
  return kstDate.toISOString().split('T')[0]
}

// POST /api/landing-pages/view - Increment page view count
export async function POST(request: NextRequest) {
  try {
    const { pageId } = await request.json()

    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 })
    }

    const supabase = getServiceRoleClient()
    const userAgent = request.headers.get('user-agent')
    const deviceType = getDeviceType(userAgent)
    const today = getTodayDateKST()

    // 1. Increment total views_count in landing_pages table
    const { error: rpcError } = await supabase.rpc('increment_landing_page_views', {
      page_id: pageId,
    })

    if (rpcError) {
      console.error('Failed to increment page views:', rpcError)
      return NextResponse.json({ error: 'Failed to increment views' }, { status: 500 })
    }

    // 2. Upsert daily analytics data
    // First, check if a record exists for today
    const { data: existingRecord, error: selectError } = await supabase
      .from('landing_page_analytics')
      .select('id, page_views, desktop_views, mobile_views, tablet_views')
      .eq('landing_page_id', pageId)
      .eq('date', today)
      .maybeSingle()

    if (selectError) {
      console.error('Failed to check existing analytics:', selectError)
      // Continue anyway - the main view count was already incremented
    }

    if (existingRecord) {
      // Update existing record
      const updateData: Record<string, number> = {
        page_views: (existingRecord.page_views || 0) + 1,
      }

      // Increment the appropriate device column
      if (deviceType === 'desktop') {
        updateData.desktop_views = (existingRecord.desktop_views || 0) + 1
      } else if (deviceType === 'mobile') {
        updateData.mobile_views = (existingRecord.mobile_views || 0) + 1
      } else {
        updateData.tablet_views = (existingRecord.tablet_views || 0) + 1
      }

      const { error: updateError } = await supabase
        .from('landing_page_analytics')
        .update(updateData)
        .eq('id', existingRecord.id)

      if (updateError) {
        console.error('Failed to update analytics:', updateError)
      }
    } else {
      // Insert new record for today
      const insertData: Record<string, unknown> = {
        landing_page_id: pageId,
        date: today,
        page_views: 1,
        desktop_views: deviceType === 'desktop' ? 1 : 0,
        mobile_views: deviceType === 'mobile' ? 1 : 0,
        tablet_views: deviceType === 'tablet' ? 1 : 0,
        unique_visitors: 1,
        form_submissions: 0,
      }

      const { error: insertError } = await supabase
        .from('landing_page_analytics')
        .insert(insertData)

      if (insertError) {
        console.error('Failed to insert analytics:', insertError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Page view error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
