// Email Sender Service
// 이전에는 nodemailer+SMTP_HOST/USER/PASSWORD로 발송했는데, 이 환경변수들이
// .env.local/.env.example 어디에도 설정된 적이 없어 "테스트 발송" 버튼이 항상
// 인증 실패로 죽어있었다(52차 QA 확인). 실제 운영 발송 경로(리드 알림, 티켓 답변
// 알림)가 전부 Resend를 쓰고 있으므로 동일하게 맞춘다.

import { Resend } from 'resend'
import { createClient } from '@/lib/supabase/server'
import type { EmailTemplate, EmailLog } from '@/types/email'
import { renderTemplate } from './template-renderer'

let resendClient: Resend | null = null

function getResendClient(): Resend | null {
  if (!resendClient && process.env.RESEND_API_KEY) {
    resendClient = new Resend(process.env.RESEND_API_KEY)
  }
  return resendClient
}

export class EmailSender {

  /**
   * Sends an email using a template
   *
   * @param template - Email template to use
   * @param to - Recipient email address
   * @param variables - Variables for template rendering
   * @param options - Additional sending options
   * @returns Promise resolving to email log ID
   */
  async sendEmail(
    template: EmailTemplate,
    to: string,
    variables: Record<string, string>,
    options?: {
      cc?: string[]
      bcc?: string[]
      attachments?: Array<{
        filename: string
        path?: string
        content?: Buffer
      }>
    }
  ): Promise<string> {
    try {
      // Render subject and body with variables
      const subject = renderTemplate(template.subject, variables)
      const html = renderTemplate(template.html_body, variables)
      const text = template.text_body
        ? renderTemplate(template.text_body, variables)
        : undefined

      const client = getResendClient()
      if (!client) {
        throw new Error('Resend API key is not configured')
      }

      // Send email
      const { data: info, error: sendError } = await client.emails.send({
        from: `${template.settings.fromName} <${template.settings.fromEmail}>`,
        to: [to],
        subject,
        html,
        text,
        replyTo: template.settings.replyTo,
        cc: options?.cc || template.settings.cc,
        bcc: options?.bcc || template.settings.bcc,
      })

      if (sendError) throw sendError

      // Log email
      const logId = await this.logEmail(
        template.id,
        to,
        subject,
        html,
        'sent',
        {
          messageId: info?.id,
        }
      )

      // Update template stats
      await this.updateStats(template.id, 'sent')

      return logId
    } catch (error) {
      // Log failed email
      const logId = await this.logEmail(
        template.id,
        to,
        template.subject,
        template.html_body,
        'failed',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
        }
      )

      throw error
    }
  }

  /**
   * Sends a test email (doesn't log or update stats)
   *
   * @param template - Email template to test
   * @param to - Test recipient email
   * @param variables - Variables for rendering
   */
  async sendTestEmail(
    template: EmailTemplate,
    to: string,
    variables: Record<string, string>
  ): Promise<void> {
    const subject = `[TEST] ${renderTemplate(template.subject, variables)}`
    const html = renderTemplate(template.html_body, variables)
    const text = template.text_body
      ? renderTemplate(template.text_body, variables)
      : undefined

    const client = getResendClient()
    if (!client) {
      throw new Error('Resend API key is not configured')
    }

    const { error: sendError } = await client.emails.send({
      from: `${template.settings.fromName} <${template.settings.fromEmail}>`,
      to: [to],
      subject,
      html,
      text,
    })

    if (sendError) throw sendError
  }

  /**
   * Logs an email to the database
   *
   * @param templateId - Template ID
   * @param recipient - Recipient email
   * @param subject - Email subject
   * @param htmlBody - Email HTML body
   * @param status - Email status
   * @param metadata - Additional metadata
   * @returns Email log ID
   */
  private async logEmail(
    templateId: string,
    recipient: string,
    subject: string,
    htmlBody: string,
    status: EmailLog['status'],
    metadata?: Record<string, unknown>
  ): Promise<string> {
    const supabase = await createClient()

    const { data, error } = await supabase
      .from('email_logs')
      .insert({
        template_id: templateId,
        recipient,
        subject,
        html_body: htmlBody,
        status,
        metadata,
        sent_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (error) {
      console.error('Failed to log email:', error)
      throw error
    }

    return data.id
  }

  /**
   * Updates template statistics
   *
   * @param templateId - Template ID
   * @param metric - Metric to increment
   */
  private async updateStats(
    templateId: string,
    metric: keyof EmailTemplate['stats']
  ): Promise<void> {
    const supabase = await createClient()

    // Get current stats
    const { data: template } = await supabase
      .from('email_templates')
      .select('stats')
      .eq('id', templateId)
      .single()

    if (!template) return

    // Increment the metric
    const updatedStats = {
      ...template.stats,
      [metric]: (template.stats[metric] || 0) + 1,
    }

    // Update stats
    await supabase
      .from('email_templates')
      .update({ stats: updatedStats })
      .eq('id', templateId)
  }

  /**
   * Records an email open event
   *
   * @param logId - Email log ID
   */
  async recordOpen(logId: string): Promise<void> {
    const supabase = await createClient()

    // Update log
    const { data: log } = await supabase
      .from('email_logs')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString(),
      })
      .eq('id', logId)
      .select('template_id')
      .single()

    if (log?.template_id) {
      // Update template stats
      await this.updateStats(log.template_id, 'opened')
    }
  }

  /**
   * Records an email click event
   *
   * @param logId - Email log ID
   */
  async recordClick(logId: string): Promise<void> {
    const supabase = await createClient()

    // Update log
    const { data: log } = await supabase
      .from('email_logs')
      .update({
        status: 'clicked',
        clicked_at: new Date().toISOString(),
      })
      .eq('id', logId)
      .select('template_id')
      .single()

    if (log?.template_id) {
      // Update template stats
      await this.updateStats(log.template_id, 'clicked')
    }
  }

  /**
   * Resend API 키가 설정되어 있는지 확인
   *
   * @returns Promise resolving to connection status
   */
  async verifyConnection(): Promise<boolean> {
    return getResendClient() !== null
  }
}

// Singleton instance
let emailSender: EmailSender | null = null

/**
 * Gets the email sender instance
 */
export function getEmailSender(): EmailSender {
  if (!emailSender) {
    emailSender = new EmailSender()
  }
  return emailSender
}
