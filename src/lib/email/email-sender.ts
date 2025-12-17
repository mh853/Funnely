// Email Sender Service
// Handles email sending via SMTP with nodemailer

import nodemailer from 'nodemailer'
import type { Transporter } from 'nodemailer'
import { createClient } from '@/lib/supabase/server'
import type { EmailTemplate, EmailLog } from '@/types/email'
import { renderTemplate } from './template-renderer'

export class EmailSender {
  private transporter: Transporter

  constructor() {
    // Initialize nodemailer transporter with SMTP settings
    // These should be configured via environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    })
  }

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

      // Prepare email options
      const mailOptions = {
        from: `"${template.settings.fromName}" <${template.settings.fromEmail}>`,
        to,
        subject,
        html,
        text,
        replyTo: template.settings.replyTo,
        cc: options?.cc || template.settings.cc,
        bcc: options?.bcc || template.settings.bcc,
        attachments: options?.attachments,
        priority: template.settings.priority || 'normal',
      }

      // Send email
      const info = await this.transporter.sendMail(mailOptions)

      // Log email
      const logId = await this.logEmail(
        template.id,
        to,
        subject,
        html,
        'sent',
        {
          messageId: info.messageId,
          response: info.response,
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

    await this.transporter.sendMail({
      from: `"${template.settings.fromName}" <${template.settings.fromEmail}>`,
      to,
      subject,
      html,
      text,
    })
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
   * Verifies SMTP connection
   *
   * @returns Promise resolving to connection status
   */
  async verifyConnection(): Promise<boolean> {
    try {
      await this.transporter.verify()
      return true
    } catch (error) {
      console.error('SMTP connection verification failed:', error)
      return false
    }
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
