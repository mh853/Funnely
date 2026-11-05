// 아침 광고 성과 동기화 크론에서 실패·시간 부족(다음 날로 넘김)이 생기면 운영자에게 알림 메일을 보낸다 - 실행 기록(cron_run_logs)만으로는 아무도 모르고 지나가서
import { Resend } from 'resend'
import { FROM_ADDRESS } from '@/lib/email/constants'
import { buildAdSyncAlertEmail, type AdSyncAlertPlatform } from '@/lib/email/email-copy'

const NOTIFICATION_RECIPIENTS = ['munong2@gmail.com', '1989comp@gmail.com']

type SyncTask = { task: string; status: 'success' | 'error'; [key: string]: unknown }

/** 크론 작업 결과를 플랫폼별 요약으로. 앱 설정이 없는 플랫폼({message, synced: 0})은 빼고, 실패한 계정 목록을 모은다 */
export function summarizeAdSyncTasks(tasks: SyncTask[]): AdSyncAlertPlatform[] {
  return tasks
    .filter((t) => t.status === 'error' || Array.isArray(t.accounts))
    .map((t) => {
      const accounts = (Array.isArray(t.accounts) ? t.accounts : []) as Array<{ accountId?: string; status?: string; error?: string }>
      return {
        platform: t.task.replace(/_ads_sync$/, ''),
        error: t.status === 'error' ? String(t.error ?? '알 수 없는 오류') : null,
        synced: Number(t.synced ?? 0),
        failed: Number(t.failed ?? 0),
        deferred: Number(t.deferred ?? 0),
        needsReconnect: Number(t.needsReconnect ?? 0),
        failedAccounts: accounts
          .filter((a) => a.status === 'error')
          .map((a) => ({ accountId: String(a.accountId ?? '?'), error: String(a.error ?? '알 수 없는 오류') })),
      }
    })
}

/** 작업 실패·계정 실패·다음 날로 넘긴 계정 중 하나라도 있으면 알린다 (재연결 필요는 고객 메일이 따로 가서 조건에서 뺀다) */
export function adSyncNeedsAlert(platforms: AdSyncAlertPlatform[]): boolean {
  return platforms.some((p) => !!p.error || p.failed > 0 || p.deferred > 0)
}

/** 문제가 있을 때만 보낸다. 발송이 실패해도 던지지 않는다 - 크론 결과를 막으면 안 된다 */
export async function sendAdSyncAlertIfNeeded(startedAt: Date, tasks: SyncTask[]): Promise<boolean> {
  const platforms = summarizeAdSyncTasks(tasks)
  if (!adSyncNeedsAlert(platforms)) return false
  if (!process.env.RESEND_API_KEY) {
    console.error('[AdSync] alert skipped: Resend API key is not configured')
    return false
  }
  try {
    const content = buildAdSyncAlertEmail({ startedAt: startedAt.toISOString(), platforms })
    const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
      from: FROM_ADDRESS,
      to: NOTIFICATION_RECIPIENTS,
      subject: content.subject,
      html: content.html,
      text: content.text,
    })
    if (error) throw error
    return true
  } catch (e) {
    console.error('[AdSync] alert email error:', e)
    return false
  }
}
