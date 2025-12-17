# Phase 4: 운영 효율화 (Operation Efficiency) - 설계 문서

## 개요

**목표**: 관리자의 반복 작업을 자동화하고 대량 작업을 효율적으로 처리할 수 있는 시스템 구축

**예상 기간**: 2-3주

**전제 조건**:
- Phase 1-3 완료
- `automation_workflows` 테이블 존재 (Phase 1.1에서 생성됨)
- RBAC 시스템 구축 완료

## Phase 4.1: 자동화 워크플로우 엔진

### 목표
트리거 조건 기반으로 자동으로 실행되는 워크플로우 시스템 구축

### 데이터베이스 설계

#### 기존 테이블 활용
```sql
-- Phase 1.1에서 이미 생성된 테이블
CREATE TABLE automation_workflows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,  -- 'schedule', 'event', 'condition'
  trigger_conditions JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 추가 필요 테이블
```sql
-- 워크플로우 실행 로그
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL,  -- 'schedule', 'manual', 'event'
  trigger_data JSONB,
  status TEXT NOT NULL,  -- 'pending', 'running', 'success', 'failed'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_result JSONB
);

-- 워크플로우 액션 로그 (각 액션별 상세 로그)
CREATE TABLE workflow_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  action_index INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL,
  status TEXT NOT NULL,  -- 'pending', 'success', 'failed', 'skipped'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB
);
```

### TypeScript 타입 정의

**`src/types/automation.ts`** (신규 생성)
```typescript
// Trigger Types
export type TriggerType = 'schedule' | 'event' | 'condition'

export interface ScheduleTrigger {
  type: 'schedule'
  cron: string  // Cron expression: "0 9 * * 1" (매주 월요일 9시)
  timezone: string  // "Asia/Seoul"
}

export interface EventTrigger {
  type: 'event'
  event: 'subscription_created' | 'subscription_cancelled' |
         'health_score_low' | 'payment_failed' | 'lead_imported'
  conditions?: Record<string, any>  // 추가 조건
}

export interface ConditionTrigger {
  type: 'condition'
  metric: 'health_score' | 'mrr' | 'usage_rate' | 'churn_risk'
  operator: '<' | '>' | '=' | '<=' | '>='
  value: number
  check_frequency: string  // Cron expression
}

export type TriggerConfig = ScheduleTrigger | EventTrigger | ConditionTrigger

// Action Types
export interface SendEmailAction {
  type: 'send_email'
  template_id: string
  to: 'company_admin' | 'support_team' | 'custom'
  custom_email?: string
  variables?: Record<string, string>
}

export interface CreateTaskAction {
  type: 'create_task'
  title: string
  description: string
  assignee_id?: string
  priority: 'low' | 'medium' | 'high'
  due_date?: string
}

export interface UpdateFieldAction {
  type: 'update_field'
  entity: 'company' | 'subscription' | 'lead'
  field: string
  value: any
}

export interface SendWebhookAction {
  type: 'send_webhook'
  url: string
  method: 'POST' | 'PUT'
  headers?: Record<string, string>
  body?: Record<string, any>
}

export type WorkflowAction =
  | SendEmailAction
  | CreateTaskAction
  | UpdateFieldAction
  | SendWebhookAction

// Workflow Definition
export interface AutomationWorkflow {
  id: string
  name: string
  description?: string
  trigger_type: TriggerType
  trigger_conditions: TriggerConfig
  actions: WorkflowAction[]
  is_active: boolean
  created_at: string
  updated_at: string
}

// Execution Types
export interface WorkflowExecution {
  id: string
  workflow_id: string
  triggered_by: 'schedule' | 'manual' | 'event'
  trigger_data?: Record<string, any>
  status: 'pending' | 'running' | 'success' | 'failed'
  started_at: string
  completed_at?: string
  error_message?: string
  execution_result?: Record<string, any>
  workflow?: AutomationWorkflow
}

export interface WorkflowActionLog {
  id: string
  execution_id: string
  action_index: number
  action_type: string
  action_config: WorkflowAction
  status: 'pending' | 'success' | 'failed' | 'skipped'
  started_at: string
  completed_at?: string
  error_message?: string
  result?: Record<string, any>
}
```

### API 엔드포인트

#### 1. 워크플로우 관리 API

**`src/app/api/admin/workflows/route.ts`**
```typescript
// GET /api/admin/workflows - 워크플로우 목록 조회
// POST /api/admin/workflows - 워크플로우 생성
```

**`src/app/api/admin/workflows/[id]/route.ts`**
```typescript
// GET /api/admin/workflows/[id] - 워크플로우 상세 조회
// PUT /api/admin/workflows/[id] - 워크플로우 수정
// DELETE /api/admin/workflows/[id] - 워크플로우 삭제
```

**`src/app/api/admin/workflows/[id]/toggle/route.ts`**
```typescript
// POST /api/admin/workflows/[id]/toggle - 활성화/비활성화
```

**`src/app/api/admin/workflows/[id]/execute/route.ts`**
```typescript
// POST /api/admin/workflows/[id]/execute - 수동 실행
```

#### 2. 실행 로그 API

**`src/app/api/admin/workflows/executions/route.ts`**
```typescript
// GET /api/admin/workflows/executions
// Query params: workflow_id, status, date_from, date_to
```

**`src/app/api/admin/workflows/executions/[id]/route.ts`**
```typescript
// GET /api/admin/workflows/executions/[id]
// Returns execution + action logs
```

### 워크플로우 엔진

**`src/lib/automation/workflowEngine.ts`** (신규 생성)
```typescript
import type { AutomationWorkflow, WorkflowAction } from '@/types/automation'
import type { SupabaseClient } from '@supabase/supabase-js'

export class WorkflowEngine {
  constructor(private supabase: SupabaseClient) {}

  /**
   * Execute a workflow
   */
  async executeWorkflow(
    workflowId: string,
    triggeredBy: 'schedule' | 'manual' | 'event',
    triggerData?: Record<string, any>
  ): Promise<string> {
    // 1. Create execution record
    const { data: execution } = await this.supabase
      .from('workflow_executions')
      .insert({
        workflow_id: workflowId,
        triggered_by: triggeredBy,
        trigger_data: triggerData,
        status: 'running',
      })
      .select()
      .single()

    const executionId = execution.id

    try {
      // 2. Get workflow
      const { data: workflow } = await this.supabase
        .from('automation_workflows')
        .select()
        .eq('id', workflowId)
        .single()

      if (!workflow || !workflow.is_active) {
        throw new Error('Workflow not found or inactive')
      }

      // 3. Execute actions sequentially
      const actions = workflow.actions as WorkflowAction[]
      for (let i = 0; i < actions.length; i++) {
        await this.executeAction(executionId, i, actions[i], triggerData)
      }

      // 4. Mark execution as success
      await this.supabase
        .from('workflow_executions')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
        })
        .eq('id', executionId)

      return executionId
    } catch (error) {
      // Mark execution as failed
      await this.supabase
        .from('workflow_executions')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', executionId)

      throw error
    }
  }

  /**
   * Execute a single action
   */
  private async executeAction(
    executionId: string,
    actionIndex: number,
    action: WorkflowAction,
    context?: Record<string, any>
  ): Promise<void> {
    // Create action log
    const { data: actionLog } = await this.supabase
      .from('workflow_action_logs')
      .insert({
        execution_id: executionId,
        action_index: actionIndex,
        action_type: action.type,
        action_config: action,
        status: 'pending',
      })
      .select()
      .single()

    try {
      let result: any = null

      switch (action.type) {
        case 'send_email':
          result = await this.executeSendEmail(action, context)
          break
        case 'create_task':
          result = await this.executeCreateTask(action, context)
          break
        case 'update_field':
          result = await this.executeUpdateField(action, context)
          break
        case 'send_webhook':
          result = await this.executeSendWebhook(action, context)
          break
        default:
          throw new Error(`Unknown action type: ${action.type}`)
      }

      // Mark action as success
      await this.supabase
        .from('workflow_action_logs')
        .update({
          status: 'success',
          completed_at: new Date().toISOString(),
          result,
        })
        .eq('id', actionLog.id)
    } catch (error) {
      // Mark action as failed
      await this.supabase
        .from('workflow_action_logs')
        .update({
          status: 'failed',
          completed_at: new Date().toISOString(),
          error_message: error instanceof Error ? error.message : 'Unknown error',
        })
        .eq('id', actionLog.id)

      throw error
    }
  }

  // Action executors (to be implemented in Phase 4.4 for email)
  private async executeSendEmail(action: any, context?: any) {
    // Placeholder - will implement in Phase 4.4
    console.log('[Workflow] Send email action:', action)
    return { message: 'Email sending not yet implemented' }
  }

  private async executeCreateTask(action: any, context?: any) {
    // TODO: Integrate with task management system
    console.log('[Workflow] Create task action:', action)
    return { message: 'Task creation not yet implemented' }
  }

  private async executeUpdateField(action: any, context?: any) {
    const { entity, field, value } = action
    // Update entity field in database
    await this.supabase
      .from(entity === 'company' ? 'companies' :
            entity === 'subscription' ? 'company_subscriptions' : 'leads')
      .update({ [field]: value })
      .eq('id', context?.entity_id)

    return { updated: true }
  }

  private async executeSendWebhook(action: any, context?: any) {
    const { url, method, headers, body } = action
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ ...body, ...context }),
    })

    return { status: response.status, ok: response.ok }
  }
}
```

### UI 컴포넌트

**`src/app/admin/workflows/page.tsx`** (신규 생성)
- 워크플로우 목록 (카드 형태)
- 활성/비활성 토글
- 수동 실행 버튼
- 생성/편집/삭제 기능
- 실행 히스토리 링크

**`src/app/admin/workflows/new/page.tsx`** (신규 생성)
- 워크플로우 생성 폼
- Trigger 타입 선택 (Schedule, Event, Condition)
- Action 추가 (Drag & Drop으로 순서 변경)
- 실시간 미리보기

**`src/app/admin/workflows/[id]/page.tsx`** (신규 생성)
- 워크플로우 상세 정보
- 편집 모드
- 실행 히스토리 테이블
- 각 실행의 액션 로그 상세

**`src/app/admin/workflows/executions/page.tsx`** (신규 생성)
- 전체 실행 로그 조회
- 필터링: 워크플로우별, 상태별, 날짜별
- 실행 상세 조회 모달

### 네비게이션 추가

**`src/app/admin/layout.tsx`** 수정
```typescript
{
  name: '워크플로우',
  href: '/admin/workflows',
  icon: '⚙️',
  permission: 'MANAGE_WORKFLOWS' as Permission,
}
```

### RBAC 권한 추가

**`src/types/rbac.ts`** 수정
```typescript
export const PERMISSIONS = {
  // ... 기존 권한들
  VIEW_WORKFLOWS: 'VIEW_WORKFLOWS',
  MANAGE_WORKFLOWS: 'MANAGE_WORKFLOWS',
  EXECUTE_WORKFLOWS: 'EXECUTE_WORKFLOWS',
} as const
```

---

## Phase 4.2: 일괄 작업 도구

### 목표
여러 엔티티를 한 번에 처리할 수 있는 대량 작업 도구

### 기능 요구사항

1. **리드 일괄 작업**
   - 상태 변경 (new → contacted → qualified → converted)
   - 태그 추가/제거
   - 담당자 할당
   - 삭제

2. **회사 일괄 작업**
   - 상태 변경 (active, churned, paused)
   - 태그 추가/제거
   - 헬스 스코어 재계산
   - 노트 추가

3. **구독 일괄 작업**
   - 플랜 변경
   - 결제 주기 변경
   - 상태 변경

### API 엔드포인트

**`src/app/api/admin/bulk/leads/route.ts`**
```typescript
// POST /api/admin/bulk/leads
// Body: { action, lead_ids, params }
```

**`src/app/api/admin/bulk/companies/route.ts`**
```typescript
// POST /api/admin/bulk/companies
// Body: { action, company_ids, params }
```

**`src/app/api/admin/bulk/subscriptions/route.ts`**
```typescript
// POST /api/admin/bulk/subscriptions
// Body: { action, subscription_ids, params }
```

### UI 컴포넌트

**각 엔티티 목록 페이지에 추가**:
- 체크박스로 다중 선택
- "일괄 작업" 드롭다운 버튼
- 작업 선택 시 파라미터 입력 모달
- 진행 상황 표시
- 결과 요약 (성공/실패 개수)

---

## Phase 4.3: 고급 내보내기 기능

### 목표
데이터를 다양한 형식으로 내보내기 (CSV, Excel, PDF)

### 기능 요구사항

1. **CSV 내보내기**
   - 리드, 회사, 구독, 매출 데이터
   - 필터 조건 반영
   - 컬럼 선택 가능

2. **Excel 내보내기**
   - 여러 시트로 구성 (요약 + 상세)
   - 차트 포함
   - 스타일링 적용

3. **PDF 리포트**
   - 대시보드 스냅샷
   - 매출 리포트
   - 헬스 스코어 리포트
   - 로고 및 브랜딩 포함

### 라이브러리

- **CSV**: `papaparse`
- **Excel**: `exceljs`
- **PDF**: `@react-pdf/renderer` 또는 `puppeteer`

### API 엔드포인트

**`src/app/api/admin/export/[entity]/route.ts`**
```typescript
// GET /api/admin/export/leads?format=csv&...filters
// GET /api/admin/export/companies?format=excel&...filters
// GET /api/admin/export/revenue?format=pdf&...filters
```

### UI 컴포넌트

**각 대시보드/목록 페이지에 추가**:
- "내보내기" 버튼
- 포맷 선택 모달 (CSV, Excel, PDF)
- 내보낼 컬럼 선택
- 다운로드 진행 표시

---

## Phase 4.4: 이메일 템플릿 시스템

### 목표
재사용 가능한 이메일 템플릿과 발송 시스템 구축

### 데이터베이스 설계

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB NOT NULL,  -- ["company_name", "user_name", ...]
  category TEXT,  -- 'notification', 'marketing', 'support'
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL,  -- 'pending', 'sent', 'failed'
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB
);
```

### TypeScript 타입

**`src/types/email.ts`** (신규 생성)
```typescript
export interface EmailTemplate {
  id: string
  name: string
  subject: string
  body_html: string
  body_text?: string
  variables: string[]
  category?: 'notification' | 'marketing' | 'support'
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface EmailLog {
  id: string
  template_id?: string
  to_email: string
  subject: string
  body_html: string
  status: 'pending' | 'sent' | 'failed'
  sent_at?: string
  error_message?: string
  metadata?: Record<string, any>
}
```

### 이메일 서비스

**`src/lib/email/emailService.ts`** (신규 생성)
```typescript
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendEmail(
  templateId: string,
  toEmail: string,
  variables: Record<string, string>
) {
  // 1. Get template
  const template = await getTemplate(templateId)

  // 2. Replace variables
  const subject = replaceVariables(template.subject, variables)
  const bodyHtml = replaceVariables(template.body_html, variables)

  // 3. Send via Resend
  const { data, error } = await resend.emails.send({
    from: 'MediSync <noreply@medisync.com>',
    to: toEmail,
    subject,
    html: bodyHtml,
  })

  // 4. Log
  await logEmail(templateId, toEmail, subject, bodyHtml, error ? 'failed' : 'sent', error?.message)

  return { success: !error, data, error }
}

function replaceVariables(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (match, key) => vars[key] || match)
}
```

### API 엔드포인트

**`src/app/api/admin/email-templates/route.ts`**
```typescript
// GET /api/admin/email-templates
// POST /api/admin/email-templates
```

**`src/app/api/admin/email-templates/[id]/route.ts`**
```typescript
// GET /api/admin/email-templates/[id]
// PUT /api/admin/email-templates/[id]
// DELETE /api/admin/email-templates/[id]
```

**`src/app/api/admin/email-templates/[id]/send/route.ts`**
```typescript
// POST /api/admin/email-templates/[id]/send
// Body: { to_email, variables }
```

### UI 컴포넌트

**`src/app/admin/email-templates/page.tsx`** (신규 생성)
- 템플릿 목록
- 카테고리별 필터
- 미리보기
- 생성/편집/삭제

**`src/app/admin/email-templates/[id]/page.tsx`** (신규 생성)
- 템플릿 편집기 (WYSIWYG)
- 변수 자동 완성
- 테스트 발송
- 발송 로그 조회

---

## 구현 순서

1. **Phase 4.1**: 자동화 워크플로우 엔진 (1주)
   - Day 1-2: DB 마이그레이션, 타입 정의, API 엔드포인트
   - Day 3-4: 워크플로우 엔진 구현
   - Day 5-7: UI 컴포넌트 (목록, 생성, 편집, 실행 로그)

2. **Phase 4.2**: 일괄 작업 도구 (3일)
   - Day 1: API 엔드포인트
   - Day 2-3: UI 통합 (체크박스, 드롭다운, 모달)

3. **Phase 4.3**: 고급 내보내기 기능 (3일)
   - Day 1: CSV 내보내기
   - Day 2: Excel 내보내기
   - Day 3: PDF 리포트

4. **Phase 4.4**: 이메일 템플릿 시스템 (3일)
   - Day 1: DB, 타입, 이메일 서비스
   - Day 2: API 엔드포인트
   - Day 3: UI (템플릿 편집기, 로그)

---

## 테스트 계획

### 워크플로우 엔진 테스트
- 스케줄 트리거 실행 테스트
- 이벤트 트리거 실행 테스트
- 조건 트리거 실행 테스트
- 각 액션 타입별 실행 테스트
- 실패 시 롤백 테스트

### 일괄 작업 테스트
- 100개 이상 엔티티 동시 처리
- 일부 실패 시 나머지 처리 계속
- 트랜잭션 안정성

### 내보내기 테스트
- 대용량 데이터 (10,000+ 행) CSV 내보내기
- Excel 다중 시트 생성
- PDF 리포트 렌더링

### 이메일 테스트
- 템플릿 변수 치환
- 대량 발송 (100+ 이메일)
- 발송 실패 시 재시도

---

## 보안 고려사항

1. **워크플로우 실행 권한**: MANAGE_WORKFLOWS 권한 필요
2. **일괄 작업 권한**: 각 엔티티별 MANAGE 권한 검증
3. **내보내기 데이터**: 민감 정보 마스킹 옵션
4. **이메일 발송**: Rate limiting, 스팸 방지
5. **Webhook URL**: HTTPS only, 화이트리스트 검증

---

## 성능 최적화

1. **워크플로우 실행**: 백그라운드 작업 큐 사용 (Vercel 제약으로 제한적)
2. **일괄 작업**: 배치 처리 (100개씩)
3. **내보내기**: 스트리밍 방식으로 메모리 사용 최소화
4. **이메일 발송**: 배치 API 사용 (Resend Batch API)

---

## 의존성

### 새로운 NPM 패키지
```json
{
  "papaparse": "^5.4.1",
  "exceljs": "^4.4.0",
  "@react-pdf/renderer": "^3.4.0",
  "resend": "^3.2.0"
}
```

### 환경 변수
```env
RESEND_API_KEY=re_xxx  # Phase 4.4에서 필요
```

---

## 마이그레이션 스크립트

**`supabase/migrations/20250101000000_phase4_workflows.sql`**
```sql
-- Phase 4.1: Workflow Executions
CREATE TABLE workflow_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_id UUID REFERENCES automation_workflows(id) ON DELETE CASCADE,
  triggered_by TEXT NOT NULL,
  trigger_data JSONB,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  execution_result JSONB
);

CREATE TABLE workflow_action_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID REFERENCES workflow_executions(id) ON DELETE CASCADE,
  action_index INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_config JSONB NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT,
  result JSONB
);

CREATE INDEX idx_workflow_executions_workflow_id ON workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON workflow_executions(status);
CREATE INDEX idx_workflow_action_logs_execution_id ON workflow_action_logs(execution_id);

-- Phase 4.4: Email Templates
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB NOT NULL,
  category TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE email_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES email_templates(id),
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  status TEXT NOT NULL,
  sent_at TIMESTAMPTZ,
  error_message TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_email_logs_template_id ON email_logs(template_id);
CREATE INDEX idx_email_logs_status ON email_logs(status);
CREATE INDEX idx_email_logs_created_at ON email_logs(created_at DESC);
```
