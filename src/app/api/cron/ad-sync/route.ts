// 매일 광고 성과 동기화 크론 - 4개 플랫폼을 동시에 돌리고, 시간이 모자라면 남은 계정은 다음 날 가장 먼저 받는다 (daily-tasks에서 분리)
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { recordCronRun, type CronTaskResult } from '@/lib/cron/run-log'
import { pickCurrentSubscription, hasValidPlanAccess } from '@/lib/subscription-current'
import { isMetaConfigured } from '@/lib/ads/meta'
import { syncMetaAdAccount } from '@/lib/ads/meta-sync'
import { isGoogleAdsConfigured } from '@/lib/ads/google'
import { syncGoogleAdAccount } from '@/lib/ads/google-sync'
import { isNaverAdsConfigured } from '@/lib/ads/naver'
import { syncNaverAdAccount } from '@/lib/ads/naver-sync'
import { autoApprovePendingNaver } from '@/lib/ads/naver-approval'
import { isKakaoAdsConfigured } from '@/lib/ads/kakao'
import { syncKakaoAdAccount } from '@/lib/ads/kakao-sync'
import { syncDaysFor } from '@/lib/ads/sync-window'

export const maxDuration = 300

// 이 시각이 지나면 새 계정을 시작하지 않는다. 이미 시작한 계정(1년치 받기 등)이 끝날 여유를 100초 남긴다.
const START_DEADLINE_MS = 200 * 1000

const AD_SYNC = {
  meta: { configured: isMetaConfigured, sync: syncMetaAdAccount },
  google: { configured: isGoogleAdsConfigured, sync: syncGoogleAdAccount },
  naver: { configured: isNaverAdsConfigured, sync: syncNaverAdAccount },
  kakao: { configured: isKakaoAdsConfigured, sync: syncKakaoAdAccount },
}
type Platform = keyof typeof AD_SYNC

/**
 * 한 플랫폼의 연결된 계정 최근 7일(1년치를 아직 안 받은 계정은 1년)을 받는다. 대시보드 접근이 막힌 회사(구독 만료 등)는
 * 시트 동기화와 같은 기준(pickCurrentSubscription + hasValidPlanAccess)으로 건너뛰고, 한 계정의 오류가 다른 계정을 막지 않는다.
 * 마지막으로 성공한 지 오래된 계정부터 받아서, 시간이 모자라 남긴 계정이 다음 날 맨 앞에 온다.
 */
async function syncAdPerformance(supabase: any, platform: Platform, deadline: number) {
  if (!AD_SYNC[platform].configured()) {
    return { message: `${platform} app not configured`, synced: 0 }
  }
  // 퍼널리가 초대를 수락한 네이버 대기 요청은 연결하고 이번 동기화에서 1년치를 받는다
  // (네이버 조회가 실패해도 이미 연결된 계정 동기화는 계속한다)
  if (platform === 'naver') await autoApprovePendingNaver(supabase).catch((e) => console.error('[AdSync] naver auto-approve error:', e))

  const { data: accounts, error } = await supabase
    .from('ad_accounts')
    .select('id, company_id, account_id, access_token, refresh_token, token_expires_at, metadata, companies!inner(is_active, withdrawn_at)')
    .eq('platform', platform)
    .eq('is_active', true)
    .eq('companies.is_active', true)
    .is('companies.withdrawn_at', null)
  if (error) {
    throw new Error(`Failed to fetch ad accounts: ${error.message}`)
  }
  if (!accounts || accounts.length === 0) {
    return { message: `No connected ${platform} ad accounts`, synced: 0 }
  }
  accounts.sort((a: any, b: any) => String(a.metadata?.last_synced_at ?? '').localeCompare(String(b.metadata?.last_synced_at ?? '')))

  const companyIds = Array.from(new Set(accounts.map((a: any) => a.company_id)))
  const { data: subRows, error: subError } = await supabase
    .from('company_subscriptions')
    .select('company_id, status, current_period_end, trial_end_date, cancelled_at, grace_period_end')
    .in('company_id', companyIds)
    .order('created_at', { ascending: false })
  if (subError) {
    throw new Error(`Failed to fetch subscriptions for ${platform} ads sync: ${subError.message}`)
  }
  const subsByCompany = new Map<string, any[]>()
  for (const row of subRows || []) {
    const list = subsByCompany.get(row.company_id) ?? []
    list.push(row)
    subsByCompany.set(row.company_id, list)
  }

  const accountResults: any[] = []
  let deferred = 0
  for (const account of accounts) {
    if (!hasValidPlanAccess(pickCurrentSubscription(subsByCompany.get(account.company_id) ?? []))) {
      accountResults.push({ accountId: account.account_id, status: 'skipped_no_access' })
      continue
    }
    if (Date.now() > deadline) {
      deferred++
      continue
    }
    accountResults.push(await AD_SYNC[platform].sync(supabase, account, syncDaysFor(account, 7)))
  }

  return {
    synced: accountResults.filter((r) => r.status === 'success').length,
    needsReconnect: accountResults.filter((r) => r.status === 'needs_reconnect').length,
    failed: accountResults.filter((r) => r.status === 'error').length,
    // 시간이 모자라 이번에 못 받은 계정 수 (다음 날 먼저 받는다). 매일 0이 아니면 플랜 상향·분할 실행을 검토한다.
    deferred,
    accounts: accountResults,
  }
}

export async function GET(request: NextRequest) {
  const startedAt = new Date()
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('[AdSync] Unauthorized access attempt')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const deadline = startedAt.getTime() + START_DEADLINE_MS

  // 플랫폼마다 API와 호출 한도가 달라 동시에 돌린다. 한 플랫폼 안에서는 한도 때문에 계정을 하나씩 받는다.
  const platforms: Platform[] = ['meta', 'google', 'naver', 'kakao']
  const tasks: CronTaskResult[] = await Promise.all(
    platforms.map(async (platform) => {
      try {
        return { task: `${platform}_ads_sync`, status: 'success' as const, ...(await syncAdPerformance(supabase, platform, deadline)) }
      } catch (error) {
        console.error(`[AdSync] ${platform} ads sync error:`, error)
        return { task: `${platform}_ads_sync`, status: 'error' as const, error: error instanceof Error ? error.message : 'Unknown error' }
      }
    })
  )

  await recordCronRun(supabase, 'ad-sync', startedAt, tasks)
  return NextResponse.json({ timestamp: startedAt.toISOString(), tasksExecuted: tasks })
}
