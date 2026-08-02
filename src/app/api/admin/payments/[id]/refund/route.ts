// 결제 건 환불 처리 - Toss 결제취소 API 호출 + DB 상태 반영 + 감사로그 (56차 QA:
// 환불 상태값/UI 라벨/감사로그 상수는 이미 있었으나 실제로 실행하는 코드가 전혀
// 없었음. 최소 버전으로 구현)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

const TOSS_SECRET_KEY = process.env.TOSS_SECRET_KEY || ''

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: transactionId } = await context.params
    const body = await request.json().catch(() => ({}))
    const cancelReason =
      typeof body.reason === 'string' && body.reason.trim()
        ? body.reason.trim()
        : '관리자 환불 처리'

    const supabase = getServiceClient()

    const { data: transaction, error: fetchError } = await supabase
      .from('payment_transactions')
      .select('id, company_id, status, payment_key, total_amount, subscription_id, plan_id, previous_plan_id')
      .eq('id', transactionId)
      .single()

    if (fetchError || !transaction) {
      return NextResponse.json({ error: '결제 내역을 찾을 수 없습니다.' }, { status: 404 })
    }

    if (transaction.status !== 'success') {
      return NextResponse.json(
        { error: '성공 처리된 결제만 환불할 수 있습니다.' },
        { status: 400 }
      )
    }

    if (!transaction.payment_key) {
      return NextResponse.json(
        { error: '결제 키가 없어 Toss 환불 요청을 보낼 수 없습니다.' },
        { status: 400 }
      )
    }

    const tossResponse = await fetch(
      `https://api.tosspayments.com/v1/payments/${transaction.payment_key}/cancel`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${TOSS_SECRET_KEY}:`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ cancelReason }),
      }
    )

    if (!tossResponse.ok) {
      const errorData = await tossResponse.json().catch(() => ({}))
      console.error('[Refund] Toss 환불 요청 실패:', errorData)
      return NextResponse.json(
        { error: errorData.message || 'Toss 환불 요청이 실패했습니다.' },
        { status: 502 }
      )
    }

    const cancelData = await tossResponse.json()

    const { error: updateError } = await supabase
      .from('payment_transactions')
      .update({
        status: 'refunded',
        canceled_at: new Date().toISOString(),
        cancel_reason: cancelReason,
        receipt_data: cancelData,
        updated_at: new Date().toISOString(),
      })
      .eq('id', transactionId)

    if (updateError) {
      // Toss 쪽은 이미 실제로 환불이 완료된 상태라 여기서 실패해도 재시도하면
      // 안 된다(이중 환불 위험) - 반드시 로그를 남겨 수동으로 DB만 동기화하게 한다.
      console.error('[Refund] Toss 환불은 성공했으나 DB 반영 실패 - 수동 확인 필요:', {
        transactionId,
        cancelData,
        updateError,
      })
      return NextResponse.json(
        { error: 'Toss 환불은 완료됐지만 내부 기록 갱신에 실패했습니다. 관리자에게 문의하세요.' },
        { status: 500 }
      )
    }

    // 업그레이드 차액 결제였다면(previous_plan_id 기록됨) 플랜을 원래대로 되돌린다 -
    // 안 그러면 환불을 받고도 상위 플랜을 계속 이용하고 다음 갱신부터 그 가격으로
    // 다시 청구된다(58차 QA 확인). 이 거래 이후 플랜이 또 바뀐 적이 없을 때만
    // 되돌린다 - 그 사이 다른 변경이 있었다면 되돌릴 "원래" 상태가 더 이상 아니므로
    // 잘못 덮어쓰지 않도록 건너뛴다(감사로그에 기록해 수동 확인 가능하게 함).
    let planReverted = false
    if (transaction.previous_plan_id && transaction.subscription_id) {
      const { data: currentSub } = await supabase
        .from('company_subscriptions')
        .select('plan_id')
        .eq('id', transaction.subscription_id)
        .single()

      if (currentSub?.plan_id === transaction.plan_id) {
        const { error: revertError } = await supabase
          .from('company_subscriptions')
          .update({
            plan_id: transaction.previous_plan_id,
            // 가격 그랜드파더링 잠금(locked_plan_id/locked_price_*)도 함께 정리해야
            // 한다 - plan_id만 되돌리고 이 값들을 그대로 두면, 되돌린 이전 플랜과
            // 잠금이 가리키는 plan_id(업그레이드했던 플랜)가 어긋나 다음 결제 때
            // 엉뚱한 가격을 참조하거나 예상과 다르게 재계산될 수 있다(62차 QA 확인).
            // 환불 시점 이전에 정확히 어떤 가격이 잠겨 있었는지는 별도로 기록해두지
            // 않아 정확한 복원이 불가능하므로, null로 비워 다음 청구 때 그 시점의
            // 카탈로그 가격으로 새로 잠기도록 한다(과거 가격을 부정확하게 지어내지 않음).
            locked_plan_id: null,
            locked_price_monthly: null,
            locked_price_yearly: null,
            updated_at: new Date().toISOString(),
          })
          .eq('id', transaction.subscription_id)

        if (revertError) {
          console.error('[Refund] 플랜 자동 복원 실패:', revertError)
        } else {
          planReverted = true
        }
      }
    }

    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.PAYMENT_REFUND,
      entityType: 'payment_transaction',
      entityId: transactionId,
      companyId: transaction.company_id,
      metadata: {
        amount: transaction.total_amount,
        reason: cancelReason,
        planReverted,
        previousPlanId: transaction.previous_plan_id,
      },
    })

    return NextResponse.json({ success: true, planReverted })
  } catch (error) {
    console.error('[Refund] Unexpected error:', error)
    return NextResponse.json({ error: '환불 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
