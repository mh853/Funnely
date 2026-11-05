// 네이버 광고계정 연결 요청이 들어오면(초대 수락 필요·직접 확인) 운영자에게 알림 메일을 보낸다 — 요청 1건에 1통
import { Resend } from 'resend'
import { config } from '@/lib/config'
import { FROM_ADDRESS } from '@/lib/email/constants'
import { buildNaverReviewNeededEmail, type NaverReviewNeededVars } from '@/lib/email/email-copy'

const NOTIFICATION_RECIPIENTS = ['munong2@gmail.com', '1989comp@gmail.com']

export async function sendNaverReviewNeededEmail(data: Omit<NaverReviewNeededVars, 'adminUrl'>) {
  if (!process.env.RESEND_API_KEY) throw new Error('Resend API key is not configured')
  const content = buildNaverReviewNeededEmail({ ...data, adminUrl: `${config.app.domain}/admin/ad-account-requests` })
  const { error } = await new Resend(process.env.RESEND_API_KEY).emails.send({
    from: FROM_ADDRESS,
    to: NOTIFICATION_RECIPIENTS,
    subject: content.subject,
    html: content.html,
    text: content.text,
  })
  if (error) throw error
}
