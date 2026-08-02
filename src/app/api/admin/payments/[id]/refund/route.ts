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
      .select('id, company_id, status, payment_key, total_amount')
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

    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.PAYMENT_REFUND,
      entityType: 'payment_transaction',
      entityId: transactionId,
      companyId: transaction.company_id,
      metadata: { amount: transaction.total_amount, reason: cancelReason },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[Refund] Unexpected error:', error)
    return NextResponse.json({ error: '환불 처리 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
