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

// POST /api/landing-pages/view - Increment page view count
export async function POST(request: NextRequest) {
  try {
    const { pageId } = await request.json()

    if (!pageId) {
      return NextResponse.json({ error: 'Missing pageId' }, { status: 400 })
    }

    const supabase = getServiceRoleClient()

    // Call RPC function to atomically increment views
    const { error } = await supabase.rpc('increment_landing_page_views', {
      page_id: pageId,
    })

    if (error) {
      console.error('Failed to increment page views:', error)
      return NextResponse.json({ error: 'Failed to increment views' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Page view error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
