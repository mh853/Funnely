// 트랜잭션 메일을 email_logs에 남기고, 실패분은 daily-tasks가 재시도한다
import { Resend } from 'resend'
import { createServiceClient } from '@/lib/supabase/server'
import { FROM_ADDRESS, MAX_RETRIES } from '@/lib/email/constants'

let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

export type TransactionalEmailKind = 'ticket_customer_reply' | 'ticket_admin_reply'

interface SendAndLogOptions {
  to: string
  subject: string
  html: string
  text?: string
  kind: TransactionalEmailKind
}

/**
 * 한 수신자에게 메일을 보내고 email_logs(실제 스키마: to_email/body_html)에 기록한다.
 * 실패하면 status를 pending으로 남겨 daily-tasks가 최대 3회 재시도한다.
 * EmailSender.logEmail은 recipient/html_body 컬럼을 써서 이 테이블에 기록 자체가 실패한다.
 */
export async function sendAndLogEmail(opts: SendAndLogOptions): Promise<{
  success: boolean
  emailId?: string
  logId?: string
}> {
  // email_logs는 database.types.ts에 없어 타입을 우회한다. 실스키마는 to_email/body_html.
  const supabase = createServiceClient() as any
  const metadata = {
    kind: opts.kind,
    retry_count: 0,
    text: opts.text ?? null,
  }

  const { data: log, error: insertError } = await supabase
    .from('email_logs')
    .insert({
      to_email: opts.to,
      subject: opts.subject,
      body_html: opts.html,
      status: 'pending',
      metadata,
    })
    .select('id')
    .single()

  if (insertError) {
    console.error('[sendAndLogEmail] email_logs insert 실패:', insertError)
  }

  const client = getResendClient()
  if (!client) {
    await markAttempt(supabase, log?.id, metadata, new Error('Resend API key is not configured'))
    throw new Error('Resend API key is not configured')
  }

  try {
    const { data, error } = await client.emails.send({
      from: FROM_ADDRESS,
      to: [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    })
    if (error) throw error

    if (log?.id) {
      await supabase
        .from('email_logs')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          error_message: null,
        })
        .eq('id', log.id)
    }

    return { success: true, emailId: data?.id, logId: log?.id }
  } catch (err) {
    await markAttempt(
      supabase,
      log?.id,
      metadata,
      err instanceof Error ? err : new Error('Unknown error')
    )
    throw err
  }
}

async function markAttempt(
  supabase: any,
  logId: string | undefined,
  metadata: { kind: string; retry_count: number; text: string | null },
  err: Error
) {
  if (!logId) return
  const nextRetry = (metadata.retry_count || 0) + 1
  await supabase
    .from('email_logs')
    .update({
      status: nextRetry >= MAX_RETRIES ? 'failed' : 'pending',
      error_message: err.message,
      metadata: { ...metadata, retry_count: nextRetry },
    })
    .eq('id', logId)
}

