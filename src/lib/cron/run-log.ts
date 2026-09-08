// 크론 실행 결과를 cron_run_logs 테이블에 남기는 헬퍼 - Vercel 런타임 로그 보존기간(1h)과 무관하게 실행 이력을 확인하기 위함

export type CronTaskResult = {
  task: string
  status: 'success' | 'error'
  [key: string]: unknown
}

/**
 * 크론 1회 실행을 1행으로 기록한다. 기록 실패는 크론 결과에 영향을 주지 않도록 로그만 남긴다.
 * status: success(전 태스크 성공) / partial(일부 태스크 error) / error(라우트 자체가 예외로 중단)
 */
export async function recordCronRun(
  supabase: any,
  job: string,
  startedAt: Date,
  tasks: CronTaskResult[],
  fatalError?: unknown
): Promise<void> {
  const finishedAt = new Date()
  const status = fatalError ? 'error' : tasks.some((t) => t.status === 'error') ? 'partial' : 'success'

  const { error } = await supabase.from('cron_run_logs').insert({
    job,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    duration_ms: finishedAt.getTime() - startedAt.getTime(),
    status,
    tasks,
    error: fatalError ? (fatalError instanceof Error ? fatalError.message : String(fatalError)) : null,
  })

  if (error) {
    console.error(`[CronRunLog] ${job} 실행 기록 실패:`, error)
  }
}

/** 보관 기간(기본 90일)이 지난 실행 이력을 삭제한다. */
export async function purgeOldCronRunLogs(supabase: any, retentionDays = 90): Promise<void> {
  const cutoff = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000).toISOString()
  const { error } = await supabase.from('cron_run_logs').delete().lt('started_at', cutoff)
  if (error) {
    console.error('[CronRunLog] 오래된 실행 기록 정리 실패:', error)
  }
}
