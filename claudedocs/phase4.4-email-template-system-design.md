# Phase 4.4: 이메일 템플릿 시스템 설계

## 개요

Phase 1.1에서 생성된 `email_templates` 테이블을 활용하여 이메일 템플릿 관리 시스템을 구현합니다.

## 기존 스키마 (Phase 1.1)

### email_templates 테이블

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('onboarding', 'billing', 'engagement', 'support', 'marketing')),
  trigger JSONB DEFAULT '{}'::jsonb,  -- {type: 'event'|'workflow'|'manual', event: '...'}
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],  -- ['company_name', 'user_name', ...]
  settings JSONB DEFAULT '{}'::jsonb,  -- {fromName, fromEmail, replyTo, cc, bcc}
  schedule JSONB DEFAULT '{}'::jsonb,  -- {delay, sendAt}
  is_active BOOLEAN DEFAULT TRUE,
  stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "bounced": 0}'::jsonb,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**장점**:
- ✅ 풍부한 메타데이터 (trigger, settings, schedule, stats)
- ✅ 변수 시스템 (`TEXT[]` 배열)
- ✅ 통계 추적 (sent, opened, clicked, bounced)
- ✅ 카테고리 분류 (onboarding, billing, engagement, support, marketing)

## TypeScript 타입 정의

### src/types/email.ts

```typescript
export type EmailCategory = 'onboarding' | 'billing' | 'engagement' | 'support' | 'marketing'

export type TriggerType = 'event' | 'workflow' | 'manual'

export interface EmailTrigger {
  type: TriggerType
  event?: string  // 'user_signup', 'subscription_created', 'payment_failed', etc.
  workflow_id?: string
}

export interface EmailSettings {
  fromName?: string  // "MediSync Team"
  fromEmail?: string  // "no-reply@medisync.com"
  replyTo?: string
  cc?: string[]
  bcc?: string[]
}

export interface EmailSchedule {
  delay?: number  // 분 단위 지연
  sendAt?: string  // ISO timestamp
}

export interface EmailStats {
  sent: number
  opened: number
  clicked: number
  bounced: number
}

export interface EmailTemplate {
  id: string
  name: string
  category?: EmailCategory
  trigger?: EmailTrigger
  subject: string
  html_body: string
  text_body?: string
  variables: string[]  // ['company_name', 'user_name', 'action_url', ...]
  settings: EmailSettings
  schedule?: EmailSchedule
  is_active: boolean
  stats: EmailStats
  created_by?: string
  created_at: string
  updated_at: string
}

export interface CreateEmailTemplateRequest {
  name: string
  category?: EmailCategory
  trigger?: EmailTrigger
  subject: string
  html_body: string
  text_body?: string
  variables?: string[]
  settings?: EmailSettings
  schedule?: EmailSchedule
  is_active?: boolean
}

export interface UpdateEmailTemplateRequest {
  name?: string
  category?: EmailCategory
  trigger?: EmailTrigger
  subject?: string
  html_body?: string
  text_body?: string
  variables?: string[]
  settings?: EmailSettings
  schedule?: EmailSchedule
  is_active?: boolean
}

export interface SendTestEmailRequest {
  template_id: string
  to_email: string
  variables?: Record<string, string>  // { company_name: "ABC Corp", ... }
}

export interface EmailTemplateResponse {
  success: boolean
  template?: EmailTemplate
  message?: string
}

export interface EmailTemplatesListResponse {
  templates: EmailTemplate[]
  total: number
}

// 사용 가능한 변수 정의
export const AVAILABLE_VARIABLES = [
  { key: 'company_name', label: '회사명', description: '고객사 회사명' },
  { key: 'user_name', label: '사용자 이름', description: '수신자 이름' },
  { key: 'user_email', label: '사용자 이메일', description: '수신자 이메일' },
  { key: 'user_role', label: '사용자 역할', description: '사용자 권한' },
  { key: 'action_url', label: '액션 URL', description: 'CTA 버튼 링크' },
  { key: 'login_url', label: '로그인 URL', description: '로그인 페이지 링크' },
  { key: 'dashboard_url', label: '대시보드 URL', description: '대시보드 링크' },
  { key: 'support_email', label: '지원 이메일', description: '고객지원 이메일' },
  { key: 'unsubscribe_url', label: '구독 취소 URL', description: '이메일 수신 거부 링크' },
  { key: 'current_date', label: '현재 날짜', description: '이메일 발송 날짜' },
  { key: 'plan_name', label: '플랜명', description: '구독 플랜 이름' },
  { key: 'amount', label: '금액', description: '결제 금액' },
  { key: 'invoice_url', label: '인보이스 URL', description: '청구서 링크' },
] as const

// 기본 템플릿 예시
export const DEFAULT_TEMPLATES = [
  {
    code: 'welcome_email',
    name: '가입 환영 이메일',
    category: 'onboarding' as EmailCategory,
    subject: '{{company_name}}님, MediSync에 오신 것을 환영합니다!',
    html_body: `
      <h1>환영합니다, {{company_name}}님!</h1>
      <p>MediSync에 가입해주셔서 감사합니다.</p>
      <p>지금 바로 첫 랜딩페이지를 만들어보세요:</p>
      <a href="{{dashboard_url}}" style="background: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; display: inline-block;">
        대시보드로 이동
      </a>
    `,
    variables: ['company_name', 'dashboard_url'],
  },
  {
    code: 'payment_receipt',
    name: '결제 영수증',
    category: 'billing' as EmailCategory,
    subject: '{{company_name}}님의 결제가 완료되었습니다',
    html_body: `
      <h1>결제 확인</h1>
      <p>{{plan_name}} 플랜 결제가 성공적으로 처리되었습니다.</p>
      <ul>
        <li>금액: {{amount}}</li>
        <li>결제일: {{current_date}}</li>
      </ul>
      <a href="{{invoice_url}}">인보이스 다운로드</a>
    `,
    variables: ['company_name', 'plan_name', 'amount', 'current_date', 'invoice_url'],
  },
] as const
```

## API 엔드포인트

### POST /api/admin/email-templates

템플릿 생성

```typescript
Request Body: CreateEmailTemplateRequest

Response:
{
  success: true,
  template: EmailTemplate,
  message: "템플릿이 생성되었습니다"
}
```

### GET /api/admin/email-templates

템플릿 목록 조회

```typescript
Query Parameters:
- category: onboarding|billing|engagement|support|marketing
- is_active: true|false
- search: string (name 검색)
- limit: number (default: 50)
- offset: number (default: 0)

Response:
{
  templates: EmailTemplate[],
  total: number
}
```

### GET /api/admin/email-templates/[id]

특정 템플릿 조회

```typescript
Response:
{
  template: EmailTemplate
}
```

### PUT /api/admin/email-templates/[id]

템플릿 수정

```typescript
Request Body: UpdateEmailTemplateRequest

Response:
{
  success: true,
  template: EmailTemplate,
  message: "템플릿이 수정되었습니다"
}
```

### DELETE /api/admin/email-templates/[id]

템플릿 삭제

```typescript
Response:
{
  success: true,
  message: "템플릿이 삭제되었습니다"
}
```

### POST /api/admin/email-templates/[id]/test

테스트 이메일 발송

```typescript
Request Body:
{
  to_email: string,
  variables?: Record<string, string>
}

Response:
{
  success: true,
  message: "테스트 이메일이 발송되었습니다"
}
```

### POST /api/admin/email-templates/[id]/toggle

템플릿 활성화/비활성화

```typescript
Response:
{
  success: true,
  is_active: boolean,
  message: "템플릿이 활성화/비활성화되었습니다"
}
```

### POST /api/admin/email-templates/[id]/duplicate

템플릿 복제

```typescript
Response:
{
  success: true,
  template: EmailTemplate,
  message: "템플릿이 복제되었습니다"
}
```

## 이메일 발송 엔진

### src/lib/email/emailSender.ts

```typescript
import nodemailer from 'nodemailer'
import { renderTemplate } from './templateRenderer'

export class EmailSender {
  private transporter: nodemailer.Transporter

  constructor() {
    // Nodemailer 설정 (예: AWS SES, SendGrid, Mailgun)
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    })
  }

  async sendEmail(
    template: EmailTemplate,
    to: string,
    variables: Record<string, string>
  ): Promise<void> {
    // 1. 템플릿 렌더링
    const subject = renderTemplate(template.subject, variables)
    const html = renderTemplate(template.html_body, variables)
    const text = template.text_body
      ? renderTemplate(template.text_body, variables)
      : undefined

    // 2. 이메일 발송
    const info = await this.transporter.sendMail({
      from: `"${template.settings.fromName}" <${template.settings.fromEmail}>`,
      to,
      subject,
      html,
      text,
      replyTo: template.settings.replyTo,
      cc: template.settings.cc,
      bcc: template.settings.bcc,
    })

    // 3. email_logs에 기록
    await this.logEmail(template.id, to, subject, html, 'sent')

    // 4. 통계 업데이트
    await this.updateStats(template.id, 'sent')
  }

  async sendTestEmail(
    template: EmailTemplate,
    to: string,
    variables: Record<string, string>
  ): Promise<void> {
    const subject = `[TEST] ${renderTemplate(template.subject, variables)}`
    const html = renderTemplate(template.html_body, variables)

    await this.transporter.sendMail({
      from: `"MediSync Test" <${template.settings.fromEmail}>`,
      to,
      subject,
      html,
    })
  }

  private async logEmail(
    templateId: string,
    to: string,
    subject: string,
    html: string,
    status: 'sent' | 'failed'
  ): Promise<void> {
    // email_logs 테이블에 기록
  }

  private async updateStats(
    templateId: string,
    metric: 'sent' | 'opened' | 'clicked' | 'bounced'
  ): Promise<void> {
    // email_templates.stats 업데이트
  }
}
```

### src/lib/email/templateRenderer.ts

```typescript
export function renderTemplate(
  template: string,
  variables: Record<string, string>
): string {
  let rendered = template

  // 변수 치환: {{variable_name}} → actual_value
  Object.entries(variables).forEach(([key, value]) => {
    const regex = new RegExp(`{{${key}}}`, 'g')
    rendered = rendered.replace(regex, value || '')
  })

  // 남은 변수 제거 (값이 제공되지 않은 경우)
  rendered = rendered.replace(/{{[^}]+}}/g, '')

  return rendered
}

export function extractVariables(template: string): string[] {
  const regex = /{{([^}]+)}}/g
  const variables: string[] = []
  let match

  while ((match = regex.exec(template)) !== null) {
    if (!variables.includes(match[1])) {
      variables.push(match[1])
    }
  }

  return variables
}

export function validateTemplate(template: EmailTemplate): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  // 1. 필수 필드 체크
  if (!template.name || template.name.trim() === '') {
    errors.push('템플릿 이름은 필수입니다')
  }

  if (!template.subject || template.subject.trim() === '') {
    errors.push('제목은 필수입니다')
  }

  if (!template.html_body || template.html_body.trim() === '') {
    errors.push('HTML 본문은 필수입니다')
  }

  // 2. 변수 일관성 체크
  const subjectVars = extractVariables(template.subject)
  const htmlVars = extractVariables(template.html_body)
  const allVars = [...new Set([...subjectVars, ...htmlVars])]

  const undeclaredVars = allVars.filter(
    v => !template.variables.includes(v)
  )

  if (undeclaredVars.length > 0) {
    errors.push(
      `선언되지 않은 변수: ${undeclaredVars.join(', ')}`
    )
  }

  // 3. 이메일 설정 체크
  if (template.settings.fromEmail &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(template.settings.fromEmail)) {
    errors.push('올바른 발신자 이메일 형식이 아닙니다')
  }

  return {
    valid: errors.length === 0,
    errors,
  }
}
```

## UI 컴포넌트

### 1. 템플릿 목록 페이지

```typescript
// src/app/admin/email-templates/page.tsx
export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [categoryFilter, setCategoryFilter] = useState<string>('all')

  useEffect(() => {
    fetchTemplates()
  }, [categoryFilter])

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">이메일 템플릿</h1>
        <Link
          href="/admin/email-templates/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-lg"
        >
          새 템플릿 만들기
        </Link>
      </div>

      {/* 필터 */}
      <div className="mb-6">
        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
        >
          <option value="all">전체 카테고리</option>
          <option value="onboarding">온보딩</option>
          <option value="billing">결제</option>
          <option value="engagement">참여</option>
          <option value="support">지원</option>
          <option value="marketing">마케팅</option>
        </select>
      </div>

      {/* 템플릿 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {templates.map(template => (
          <TemplateCard key={template.id} template={template} />
        ))}
      </div>
    </div>
  )
}
```

### 2. 템플릿 편집기

```typescript
// src/app/admin/email-templates/[id]/edit/page.tsx
import { TemplateEditor } from '@/components/email/TemplateEditor'

export default function EditTemplatePage({ params }: { params: { id: string } }) {
  const [template, setTemplate] = useState<EmailTemplate | null>(null)

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">템플릿 편집</h1>

      {template && (
        <TemplateEditor
          template={template}
          onSave={handleSave}
          onCancel={() => router.back()}
        />
      )}
    </div>
  )
}
```

### 3. 템플릿 편집기 컴포넌트

```typescript
// src/components/email/TemplateEditor.tsx
interface TemplateEditorProps {
  template?: EmailTemplate
  onSave: (template: CreateEmailTemplateRequest) => Promise<void>
  onCancel: () => void
}

export function TemplateEditor({ template, onSave, onCancel }: TemplateEditorProps) {
  const [name, setName] = useState(template?.name || '')
  const [category, setCategory] = useState(template?.category)
  const [subject, setSubject] = useState(template?.subject || '')
  const [htmlBody, setHtmlBody] = useState(template?.html_body || '')
  const [textBody, setTextBody] = useState(template?.text_body || '')
  const [showPreview, setShowPreview] = useState(false)
  const [testEmail, setTestEmail] = useState('')

  // 자동으로 변수 추출
  const detectedVariables = useMemo(() => {
    const subjectVars = extractVariables(subject)
    const htmlVars = extractVariables(htmlBody)
    return [...new Set([...subjectVars, ...htmlVars])]
  }, [subject, htmlBody])

  async function handleSave() {
    const templateData: CreateEmailTemplateRequest = {
      name,
      category,
      subject,
      html_body: htmlBody,
      text_body: textBody,
      variables: detectedVariables,
      settings: {
        fromName: 'MediSync Team',
        fromEmail: 'no-reply@medisync.com',
      },
    }

    await onSave(templateData)
  }

  async function handleSendTest() {
    if (!testEmail) {
      alert('테스트 이메일 주소를 입력하세요')
      return
    }

    const response = await fetch(`/api/admin/email-templates/${template?.id}/test`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to_email: testEmail,
        variables: {
          company_name: 'Test Company',
          user_name: 'Test User',
          dashboard_url: 'https://medisync.com/dashboard',
          // ... 기본 테스트 값
        },
      }),
    })

    if (response.ok) {
      alert('테스트 이메일이 발송되었습니다')
    }
  }

  return (
    <div className="grid grid-cols-2 gap-6">
      {/* 왼쪽: 편집 영역 */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">템플릿 이름</label>
          <input
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="예: 가입 환영 이메일"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">카테고리</label>
          <select
            value={category}
            onChange={e => setCategory(e.target.value as EmailCategory)}
            className="w-full px-3 py-2 border rounded-lg"
          >
            <option value="">선택하세요</option>
            <option value="onboarding">온보딩</option>
            <option value="billing">결제</option>
            <option value="engagement">참여</option>
            <option value="support">지원</option>
            <option value="marketing">마케팅</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">제목</label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg"
            placeholder="예: {{company_name}}님, 환영합니다!"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">HTML 본문</label>
          <textarea
            value={htmlBody}
            onChange={e => setHtmlBody(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg font-mono text-sm"
            rows={15}
            placeholder="HTML 템플릿을 입력하세요. 변수는 {{variable_name}} 형식으로 사용합니다."
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">
            감지된 변수 ({detectedVariables.length})
          </label>
          <div className="flex flex-wrap gap-2">
            {detectedVariables.map(variable => (
              <span
                key={variable}
                className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded"
              >
                {variable}
              </span>
            ))}
          </div>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg"
          >
            저장
          </button>
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 rounded-lg"
          >
            취소
          </button>
          <button
            onClick={() => setShowPreview(!showPreview)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg"
          >
            미리보기
          </button>
        </div>
      </div>

      {/* 오른쪽: 미리보기 / 테스트 발송 */}
      <div className="space-y-4">
        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">미리보기</h3>
          <div className="border-b pb-2 mb-2">
            <div className="text-sm text-gray-500">제목:</div>
            <div className="font-medium">{subject || '(제목 없음)'}</div>
          </div>
          <div
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: htmlBody || '<p>(내용 없음)</p>' }}
          />
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">테스트 발송</h3>
          <input
            type="email"
            value={testEmail}
            onChange={e => setTestEmail(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg mb-2"
            placeholder="test@example.com"
          />
          <button
            onClick={handleSendTest}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg"
            disabled={!template?.id}
          >
            테스트 이메일 발송
          </button>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-semibold mb-3">사용 가능한 변수</h3>
          <div className="space-y-2 text-sm">
            {AVAILABLE_VARIABLES.map(variable => (
              <div key={variable.key} className="border-b pb-2">
                <div className="font-mono text-blue-600">
                  {`{{${variable.key}}}`}
                </div>
                <div className="text-gray-600">{variable.description}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
```

## 이메일 추적 (선택적)

### Tracking Pixel for Open Rate

```typescript
// src/app/api/email-tracking/open/route.ts
export async function GET(request: NextRequest) {
  const emailLogId = request.nextUrl.searchParams.get('id')

  if (emailLogId) {
    // email_logs의 opened_at 업데이트
    // email_templates.stats.opened 증가
  }

  // 1x1 투명 픽셀 반환
  return new Response(
    Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'),
    {
      headers: {
        'Content-Type': 'image/gif',
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      },
    }
  )
}
```

HTML 템플릿에 추가:
```html
<img src="https://medisync.com/api/email-tracking/open?id={{email_log_id}}" width="1" height="1" alt="" />
```

### Click Tracking

```typescript
// src/app/api/email-tracking/click/route.ts
export async function GET(request: NextRequest) {
  const emailLogId = request.nextUrl.searchParams.get('id')
  const targetUrl = request.nextUrl.searchParams.get('url')

  if (emailLogId) {
    // email_logs의 clicked_at 업데이트
    // email_templates.stats.clicked 증가
  }

  // 원래 URL로 리다이렉트
  return Response.redirect(targetUrl || 'https://medisync.com')
}
```

## RBAC 권한 추가

### src/types/rbac.ts에 추가

```typescript
export const PERMISSIONS = {
  // ... 기존 권한

  // 이메일 템플릿
  VIEW_EMAIL_TEMPLATES: 'view_email_templates',
  MANAGE_EMAIL_TEMPLATES: 'manage_email_templates',
  SEND_TEST_EMAILS: 'send_test_emails',
} as const

export const PERMISSION_INFO: Record<string, PermissionInfo> = {
  // ... 기존 권한 정보

  [PERMISSIONS.VIEW_EMAIL_TEMPLATES]: {
    code: PERMISSIONS.VIEW_EMAIL_TEMPLATES,
    name: '이메일 템플릿 조회',
    description: '이메일 템플릿 목록 및 내용 조회',
    category: '마케팅',
  },
  [PERMISSIONS.MANAGE_EMAIL_TEMPLATES]: {
    code: PERMISSIONS.MANAGE_EMAIL_TEMPLATES,
    name: '이메일 템플릿 관리',
    description: '이메일 템플릿 생성, 수정, 삭제',
    category: '마케팅',
  },
  [PERMISSIONS.SEND_TEST_EMAILS]: {
    code: PERMISSIONS.SEND_TEST_EMAILS,
    name: '테스트 이메일 발송',
    description: '이메일 템플릿 테스트 발송',
    category: '마케팅',
  },
}

export const PERMISSION_CATEGORIES = [
  // ... 기존 카테고리

  {
    name: '마케팅',
    permissions: [
      PERMISSIONS.VIEW_EMAIL_TEMPLATES,
      PERMISSIONS.MANAGE_EMAIL_TEMPLATES,
      PERMISSIONS.SEND_TEST_EMAILS,
    ],
  },
]
```

## 필요한 npm 패키지

```bash
npm install nodemailer
npm install --save-dev @types/nodemailer
```

## 환경 변수 설정

```.env.local
# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Or use email service provider
# SENDGRID_API_KEY=...
# MAILGUN_API_KEY=...
# AWS_SES_REGION=...
```

## 구현 우선순위

1. **Phase 4.4.1**: TypeScript 타입 및 기본 API 엔드포인트
2. **Phase 4.4.2**: 템플릿 목록 및 상세 페이지 UI
3. **Phase 4.4.3**: 템플릿 편집기 구현
4. **Phase 4.4.4**: 이메일 발송 엔진 (nodemailer 통합)
5. **Phase 4.4.5**: 테스트 이메일 발송 기능
6. **Phase 4.4.6**: 이메일 추적 (open/click tracking) - 선택적
7. **Phase 4.4.7**: 기본 템플릿 시딩

## 테스트 시나리오

1. **템플릿 생성**: 새 템플릿 만들고 변수 자동 감지 확인
2. **변수 치환**: 실제 값으로 변수가 올바르게 치환되는지 확인
3. **테스트 발송**: Gmail, Outlook 등에서 올바르게 표시되는지 확인
4. **HTML 렌더링**: 다양한 이메일 클라이언트에서 HTML 호환성 확인
5. **통계 추적**: 발송/오픈/클릭 통계가 올바르게 기록되는지 확인
6. **권한 체크**: RBAC 권한에 따라 접근 제어 확인

## 보안 고려사항

1. **XSS 방지**: HTML 템플릿 sanitization
2. **스팸 방지**: Rate limiting on email sending
3. **데이터 검증**: 이메일 주소 형식 검증
4. **권한 체크**: API에서 RBAC 권한 검증
5. **로깅**: 모든 이메일 발송 기록 (audit trail)
