// 홈페이지 문의(public_inquiries) 접수 시 관리자에게 알림 메일을 발송한다
import { Resend } from 'resend'
import { escapeHtml } from '@/lib/email/template-renderer'

let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

const NOTIFICATION_RECIPIENTS = ['munong2@gmail.com', '1989comp@gmail.com']

const INQUIRY_TYPE_LABELS: Record<string, string> = {
  general: '일반 문의',
  sales: '영업 상담',
  technical: '기술 문의',
  billing: '결제 문의',
}

interface InquiryNotificationData {
  inquiryType: string
  name: string
  email: string
  phone?: string | null
  company?: string | null
  subject: string
  message: string
  createdAt: string
}

/**
 * 홈페이지 문의 접수 알림 이메일 전송
 */
export async function sendInquiryNotificationEmail(data: InquiryNotificationData) {
  const { inquiryType, name, email, phone, company, subject, message, createdAt } = data

  const client = getResendClient()
  if (!client) {
    throw new Error('Resend API key is not configured')
  }

  const typeLabel = INQUIRY_TYPE_LABELS[inquiryType] || '일반 문의'

  const kstDate = new Date(new Date(createdAt).getTime() + 9 * 60 * 60 * 1000)
  const formattedDate = kstDate.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  })

  // 문의 폼 입력값은 비로그인 사용자가 임의로 입력하는 값이라, HTML 이스케이프 없이
  // 그대로 삽입하면 XSS가, 제목에 개행문자가 섞이면 헤더 인젝션이 가능하다
  // (send-lead-notification.ts와 동일한 이유).
  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safePhone = phone ? escapeHtml(phone) : null
  const safeCompany = company ? escapeHtml(company) : null
  const safeSubject = escapeHtml(subject)
  const safeMessage = escapeHtml(message).replace(/\n/g, '<br>')

  const dashboardUrl = process.env.NEXT_PUBLIC_DOMAIN
    ? process.env.NEXT_PUBLIC_DOMAIN.replace(/\/$/, '') + '/admin/support/inquiries'
    : 'https://funnely.co.kr/admin/support/inquiries'

  const emailSubject = `[Funnely] 새 홈페이지 문의 [${typeLabel}] - ${subject.replace(/[\r\n]/g, ' ')}`

  const htmlContent = `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif;
      background-color: #f9fafb;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
      border-radius: 8px 8px 0 0;
      text-align: center;
    }
    .header h1 {
      margin: 0 0 10px 0;
      font-size: 24px;
      font-weight: 700;
    }
    .header p {
      margin: 0;
      font-size: 14px;
      opacity: 0.95;
    }
    .content {
      background: #ffffff;
      padding: 30px;
      border: 1px solid #e5e7eb;
      border-top: none;
    }
    .info-row {
      padding: 12px 0;
      border-bottom: 1px solid #f3f4f6;
    }
    .info-row:last-child {
      border-bottom: none;
    }
    .label {
      font-weight: 600;
      color: #6b7280;
      font-size: 13px;
      margin-bottom: 4px;
    }
    .value {
      color: #111827;
      font-size: 15px;
      font-weight: 500;
      white-space: pre-wrap;
    }
    .button {
      display: inline-block;
      background: #667eea;
      color: white !important;
      padding: 14px 28px;
      border-radius: 8px;
      text-decoration: none;
      font-weight: 600;
      margin-top: 24px;
      text-align: center;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #9ca3af;
      font-size: 12px;
      line-height: 1.6;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📩 새 홈페이지 문의가 도착했습니다!</h1>
      <p>[${typeLabel}] ${safeSubject}</p>
    </div>

    <div class="content">
      <div class="info-row">
        <div class="label">👤 이름</div>
        <div class="value">${safeName}</div>
      </div>

      <div class="info-row">
        <div class="label">📧 이메일</div>
        <div class="value">${safeEmail}</div>
      </div>

      ${
        safePhone
          ? `
      <div class="info-row">
        <div class="label">📞 연락처</div>
        <div class="value">${safePhone}</div>
      </div>
      `
          : ''
      }

      ${
        safeCompany
          ? `
      <div class="info-row">
        <div class="label">🏢 회사명</div>
        <div class="value">${safeCompany}</div>
      </div>
      `
          : ''
      }

      <div class="info-row">
        <div class="label">📝 문의 내용</div>
        <div class="value">${safeMessage}</div>
      </div>

      <div class="info-row">
        <div class="label">⏰ 접수 시간</div>
        <div class="value">${formattedDate}</div>
      </div>

      <div style="text-align: center;">
        <a href="${dashboardUrl}" class="button">
          어드민에서 확인하기 →
        </a>
      </div>
    </div>

    <div class="footer">
      <p>이 이메일은 Funnely 홈페이지 문의 접수 시 자동 발송되었습니다.</p>
    </div>
  </div>
</body>
</html>
  `

  const textContent = `
📩 새 홈페이지 문의가 도착했습니다!

[${typeLabel}] ${subject}

👤 이름: ${name}
📧 이메일: ${email}
${phone ? `📞 연락처: ${phone}\n` : ''}${company ? `🏢 회사명: ${company}\n` : ''}📝 문의 내용: ${message}
⏰ 접수 시간: ${formattedDate}

어드민에서 확인하기: ${dashboardUrl}
  `

  const { data: emailData, error } = await client.emails.send({
    from: 'Funnely <noreply@funnely.co.kr>',
    to: NOTIFICATION_RECIPIENTS,
    subject: emailSubject,
    html: htmlContent,
    text: textContent,
  })

  if (error) {
    throw error
  }

  return {
    success: true,
    emailId: emailData?.id,
  }
}
