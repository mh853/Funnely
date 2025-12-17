# Phase 4 마이그레이션 오류 분석 및 해결

## 문제 상황

**오류 메시지**:
```
ERROR: 42P07: relation "email_templates" already exists
```

## 원인 분석

Phase 1.1 마이그레이션(`20251216000000_admin_enhancement_schema.sql`)에서 `email_templates` 테이블이 이미 생성되었으나, Phase 4 마이그레이션(`20250101000000_phase4_workflows.sql`)에서 동일한 테이블을 다시 생성하려고 시도하여 충돌이 발생했습니다.

## 스키마 비교

### Phase 1.1 스키마 (기존)

```sql
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('onboarding', 'billing', 'engagement', 'support', 'marketing')),
  trigger JSONB DEFAULT '{}'::jsonb,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "bounced": 0}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
```

**특징**:
- 더 풍부한 스키마 (trigger, settings, schedule, stats, created_by)
- category 값: `onboarding`, `billing`, `engagement`, `support`, `marketing`
- variables는 `TEXT[]` 배열

### Phase 4 원래 스키마 (충돌)

```sql
CREATE TABLE email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  category TEXT CHECK (category IN ('notification', 'marketing', 'support')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**특징**:
- 단순한 스키마
- category 값: `notification`, `marketing`, `support`
- variables는 `JSONB`

## 호환성 분석

### ✅ 호환 가능한 컬럼
- `id`, `name`, `subject`, `is_active`, `created_at`, `updated_at`
- Phase 1.1이 더 많은 필드를 가지고 있어 Phase 4 요구사항을 충족함

### ⚠️ 차이점
1. **body 컬럼명**:
   - Phase 1.1: `html_body`, `text_body`
   - Phase 4: `body_html`, `body_text`

2. **variables 타입**:
   - Phase 1.1: `TEXT[]` (PostgreSQL 배열)
   - Phase 4: `JSONB`

3. **category 값**:
   - Phase 1.1: 5개 카테고리
   - Phase 4: 3개 카테고리 (subset)

## 해결 방안

### 옵션 1: Phase 1.1 스키마 사용 (권장 ✅)

**장점**:
- 더 풍부한 기능 (stats, schedule, settings)
- 이미 존재하는 테이블 활용
- 추가 마이그레이션 불필요

**필요 작업**:
1. TypeScript 타입 수정 (`src/types/automation.ts`)
2. 워크플로우 엔진 코드 수정 (`src/lib/automation/workflowEngine.ts`)
3. 컬럼명 매핑: `body_html` → `html_body`, `body_text` → `text_body`

### 옵션 2: ALTER TABLE로 컬럼 추가

Phase 1.1 스키마에 Phase 4가 필요로 하는 컬럼이 없다면 추가하는 방식.

**현재 상황**: Phase 1.1 스키마가 Phase 4 요구사항을 모두 포함하므로 불필요.

## 수정된 마이그레이션

### 파일: `20250101000000_phase4_workflows_fixed.sql`

```sql
-- Phase 4.1: Workflow Automation System (FIXED)
-- Note: email_templates already exists from Phase 1.1

-- Only create workflow execution tables
CREATE TABLE IF NOT EXISTS workflow_executions (...);
CREATE TABLE IF NOT EXISTS workflow_action_logs (...);
CREATE TABLE IF NOT EXISTS email_logs (...);
```

**변경사항**:
- `email_templates` 테이블 생성 제거
- `email_logs` 테이블만 생성 (Phase 1.1에 없음)
- `IF NOT EXISTS` 사용으로 안전성 확보

## 코드 수정 필요사항

### 1. TypeScript 타입 수정

**파일**: `src/types/automation.ts` 또는 별도 `src/types/email.ts`

```typescript
// Phase 1.1 스키마에 맞게 수정
export interface EmailTemplate {
  id: string
  name: string
  category?: 'onboarding' | 'billing' | 'engagement' | 'support' | 'marketing'
  trigger?: Record<string, any>
  subject: string
  html_body: string  // body_html → html_body
  text_body?: string // body_text → text_body
  variables?: string[]  // JSONB → TEXT[]
  settings?: Record<string, any>
  schedule?: Record<string, any>
  is_active: boolean
  stats?: {
    sent: number
    opened: number
    clicked: number
    bounced: number
  }
  created_by?: string
  created_at: string
  updated_at: string
}
```

### 2. 워크플로우 엔진 수정

**파일**: `src/lib/automation/workflowEngine.ts`

```typescript
// SendEmailAction 실행 시 컬럼명 매핑
private async executeSendEmail(action: SendEmailAction, context?: any) {
  // Phase 4.4에서 구현 시:
  // - body_html → html_body
  // - body_text → text_body
  // - variables: string[] 형태로 처리
}
```

## 실행 순서

### 1. 수정된 마이그레이션 실행

**Supabase Dashboard SQL Editor**:
```sql
-- 내용: 20250101000000_phase4_workflows_fixed.sql
```

### 2. 코드 업데이트 (Phase 4.4에서 처리)

현재는 email 관련 코드가 placeholder이므로, Phase 4.4 구현 시 Phase 1.1 스키마에 맞게 작성하면 됩니다.

## 검증 체크리스트

- [x] `email_templates` 중복 생성 제거
- [x] `workflow_executions`, `workflow_action_logs` 테이블 생성
- [x] `email_logs` 테이블 생성
- [x] 모든 테이블에 `IF NOT EXISTS` 적용
- [ ] TypeScript 타입 수정 (Phase 4.4에서 처리)
- [ ] 워크플로우 엔진 email action 구현 (Phase 4.4에서 처리)

## 결론

**권장 방안**: Phase 1.1의 `email_templates` 스키마를 그대로 사용하고, Phase 4.4에서 이메일 템플릿 시스템 구현 시 해당 스키마에 맞게 코드를 작성합니다.

**즉시 실행**: `20250101000000_phase4_workflows_fixed.sql` 파일을 Supabase Dashboard에서 실행하여 workflow 테이블들만 생성합니다.
