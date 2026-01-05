import { Resend } from 'resend'

// Lazy initialization to avoid build-time errors when API key is not set
let resend: Resend | null = null

function getResendClient() {
  if (!resend && process.env.RESEND_API_KEY) {
    resend = new Resend(process.env.RESEND_API_KEY)
  }
  return resend
}

interface LeadNotificationData {
  recipientEmail: string
  companyName: string
  leadName: string
  leadPhone: string
  leadEmail?: string | null
  landingPageTitle?: string | null
  deviceType?: string | null
  createdAt: string
  dashboardUrl: string
}

/**
 * 리드 유입 알림 이메일 전송
 */
export async function sendLeadNotificationEmail(data: LeadNotificationData) {
  const {
    recipientEmail,
    companyName,
    leadName,
    leadPhone,
    leadEmail,
    landingPageTitle,
    deviceType,
    createdAt,
    dashboardUrl,
  } = data

  // 디바이스 타입 한글 변환
  const deviceTypeKR =
    deviceType === 'mobile' ? '모바일' : deviceType === 'tablet' ? '태블릿' : '데스크톱'

  // 시간 포맷팅 (KST)
  const dateObj = new Date(createdAt)
  const kstDate = new Date(dateObj.getTime() + 9 * 60 * 60 * 1000)
  const formattedDate = kstDate.toLocaleString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Seoul',
  })

  const subject = `[Funnely] 새로운 상담 신청 - ${leadName}`

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
    .button:hover {
      background: #5568d3;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #9ca3af;
      font-size: 12px;
      line-height: 1.6;
    }
    .footer a {
      color: #667eea;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎉 새로운 상담 신청이 도착했습니다!</h1>
      <p>랜딩페이지를 통해 신규 리드가 유입되었습니다.</p>
    </div>

    <div class="content">
      <div class="info-row">
        <div class="label">👤 고객명</div>
        <div class="value">${leadName}</div>
      </div>

      <div class="info-row">
        <div class="label">📞 연락처</div>
        <div class="value">${leadPhone}</div>
      </div>

      ${
        leadEmail
          ? `
      <div class="info-row">
        <div class="label">📧 이메일</div>
        <div class="value">${leadEmail}</div>
      </div>
      `
          : ''
      }

      ${
        landingPageTitle
          ? `
      <div class="info-row">
        <div class="label">📄 랜딩페이지</div>
        <div class="value">${landingPageTitle}</div>
      </div>
      `
          : ''
      }

      <div class="info-row">
        <div class="label">⏰ 신청 시간</div>
        <div class="value">${formattedDate}</div>
      </div>

      <div class="info-row">
        <div class="label">📱 디바이스</div>
        <div class="value">${deviceTypeKR}</div>
      </div>

      <div style="text-align: center;">
        <a href="${dashboardUrl}" class="button">
          대시보드에서 확인하기 →
        </a>
      </div>
    </div>

    <div class="footer">
      <p>이 이메일은 <strong>${companyName}</strong>의 Funnely 알림 설정에 따라 자동 발송되었습니다.</p>
      <p>알림 설정은 <a href="${dashboardUrl}/settings/notifications">여기</a>에서 변경할 수 있습니다.</p>
    </div>
  </div>
</body>
</html>
  `

  const textContent = `
🎉 새로운 상담 신청이 도착했습니다!

랜딩페이지를 통해 신규 리드가 유입되었습니다.

👤 고객명: ${leadName}
📞 연락처: ${leadPhone}
${leadEmail ? `📧 이메일: ${leadEmail}\n` : ''}${landingPageTitle ? `📄 랜딩페이지: ${landingPageTitle}\n` : ''}⏰ 신청 시간: ${formattedDate}
📱 디바이스: ${deviceTypeKR}

대시보드에서 확인하기: ${dashboardUrl}

---
이 이메일은 ${companyName}의 Funnely 알림 설정에 따라 자동 발송되었습니다.
알림 설정: ${dashboardUrl}/settings/notifications
  `

  try {
    const client = getResendClient()

    if (!client) {
      throw new Error('Resend API key is not configured')
    }

    const { data: emailData, error } = await client.emails.send({
      // TODO: Change to 'Funnely <noreply@funnely.co.kr>' after domain verification
      from: 'Funnely <onboarding@resend.dev>',
      to: [recipientEmail],
      subject,
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
  } catch (error) {
    console.error('Failed to send lead notification email:', error)
    throw error
  }
}
