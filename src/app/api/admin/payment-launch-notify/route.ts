// 결제 정식 오픈 알림 신청 목록 조회 (노션 31번 항목 후속)
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

export async function GET() {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data, error } = await supabase
    .from('payment_launch_notify_signups')
    .select('id, email, created_at, launch_email_sent_at')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('payment_launch_notify_signups list error:', error)
    return NextResponse.json({ error: '목록을 불러오지 못했습니다.' }, { status: 500 })
  }

  return NextResponse.json({ signups: data ?? [] })
}
