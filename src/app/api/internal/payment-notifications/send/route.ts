// 엣지 함수(toss-billing-payment)가 결제 직후 호출하는 결제 알림 즉시 발송 라우트. 크론(daily-tasks)은 폴백
import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { sendPendingPaymentNotifications } from '@/lib/email/payment-notification-sender'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  const secret = process.env.INTERNAL_API_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'INTERNAL_API_SECRET is not configured' }, { status: 503 })
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let ids: string[] = []
  try {
    const body = await request.json()
    ids = Array.isArray(body?.ids) ? body.ids.filter((v: unknown) => typeof v === 'string') : []
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }
  if (ids.length === 0 || ids.length > 50) {
    return NextResponse.json({ error: 'ids must contain 1-50 items' }, { status: 400 })
  }

  try {
    const supabase = createServiceClient()
    const result = await sendPendingPaymentNotifications(supabase, {
      ids,
      logPrefix: '[Payment Notifications/immediate]',
    })
    return NextResponse.json(result)
  } catch (error) {
    console.error('[Payment Notifications/immediate] failed:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}
