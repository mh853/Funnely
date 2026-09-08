// 구독 갱신 결제·체험 자동전환·만료 처리만 자주(분 단위) 돌리기 위한 크론 라우트 - daily-tasks에서 분리 (Vercel Pro 전환 후 vercel.json에 스케줄 등록)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  processSubscriptionRenewals,
  autoConvertExpiredTrials,
  checkSubscriptionExpiry,
} from '@/lib/subscription/billing-tasks'
import { recordCronRun, type CronTaskResult } from '@/lib/cron/run-log'

/**
 * GET /api/cron/subscription-billing
 *
 * daily-tasks는 하루 1회(08:00 KST)라 만료 시각과 갱신 결제 사이에 최대 24시간 공백이
 * 생겨, 대시보드는 이미 "만료됨"으로 보이는데 결제는 아직 시도조차 안 된 구간이 있었다.
 * 시간에 민감한 세 태스크만 여기서 자주 돌린다. daily-tasks의 같은 태스크들은 안전망으로
 * 그대로 두며(멱등), past_due 재시도만은 daily-tasks에서만 하루 1회 수행한다 - 여기서도
 * 재시도하면 실패한 카드에 유예기간 내내 10분마다 결제를 시도하게 되기 때문.
 *
 * 순서 중요: 갱신 결제 → 체험 자동전환 → 만료 처리 (daily-tasks와 동일)
 */
export async function GET(request: NextRequest) {
  const startedAt = new Date()
  const tasksExecuted: CronTaskResult[] = []
  let supabase: any = null

  try {
    const authHeader = request.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error('[BillingCron] Unauthorized access attempt')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const steps: Array<[string, () => Promise<Record<string, unknown>>]> = [
      ['subscription_renewal', () => processSubscriptionRenewals(supabase, { includePastDueRetries: false })],
      ['trial_auto_convert', () => autoConvertExpiredTrials(supabase)],
      ['subscription_expiry_check', () => checkSubscriptionExpiry(supabase)],
    ]

    for (const [task, run] of steps) {
      try {
        const result = await run()
        tasksExecuted.push({ task, status: 'success', ...result })
      } catch (error) {
        console.error(`[BillingCron] ${task} error:`, error)
        tasksExecuted.push({
          task,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error',
        })
      }
    }

    await recordCronRun(supabase, 'subscription-billing', startedAt, tasksExecuted)

    return NextResponse.json({ timestamp: startedAt.toISOString(), tasksExecuted })
  } catch (error) {
    console.error('[BillingCron] Unexpected error:', error)
    if (supabase) {
      await recordCronRun(supabase, 'subscription-billing', startedAt, tasksExecuted, error)
    }
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
