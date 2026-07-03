// toss-billing-auth 에지 함수 프록시: trial 상태 구독도 처리 가능하도록 상태 전환 후 호출
import { NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session) return NextResponse.json({ error: '세션이 만료되었습니다.' }, { status: 401 })

  const { authKey, customerKey, subscriptionId } = await request.json()
  if (!authKey || !customerKey || !subscriptionId) {
    return NextResponse.json({ error: '필수 파라미터가 누락되었습니다.' }, { status: 400 })
  }

  const svc = createServiceClient() as any

  // 현재 구독 상태 확인
  const { data: currentSub } = await svc
    .from('company_subscriptions')
    .select('id, status, company_id')
    .eq('id', subscriptionId)
    .maybeSingle()

  if (!currentSub) {
    return NextResponse.json({ error: '구독 정보를 찾을 수 없습니다.' }, { status: 404 })
  }

  // 사용자 권한 확인
  const { data: profile } = await svc
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile || profile.company_id !== currentSub.company_id) {
    return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
  }

  const wasTrial = currentSub.status === 'trial'

  // trial 상태면 active로 임시 전환 (에지 함수가 trial 구독을 찾지 못하는 문제 해결)
  if (wasTrial) {
    const { error: statusError } = await svc
      .from('company_subscriptions')
      .update({ status: 'active' })
      .eq('id', subscriptionId)

    if (statusError) {
      return NextResponse.json({ error: '구독 상태 업데이트에 실패했습니다.' }, { status: 500 })
    }
  }

  // toss-billing-auth 에지 함수 호출
  const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const authRes = await fetch(`${baseUrl}/functions/v1/toss-billing-auth`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ customerKey, authKey, subscriptionId }),
  })

  if (!authRes.ok) {
    // 실패 시 trial 상태로 롤백
    if (wasTrial) {
      await svc
        .from('company_subscriptions')
        .update({ status: 'trial' })
        .eq('id', subscriptionId)
    }
    const err = await authRes.json()
    return NextResponse.json(
      { error: err.error || '카드 등록에 실패했습니다.' },
      { status: 500 }
    )
  }

  const result = await authRes.json()
  return NextResponse.json(result)
}
