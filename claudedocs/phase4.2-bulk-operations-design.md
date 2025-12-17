# Phase 4.2: 일괄 작업 도구 (Bulk Operations Tool) - 설계 문서

## 개요

**목표**: 여러 엔티티를 한 번에 처리할 수 있는 대량 작업 도구 구축

**예상 기간**: 2-3일

**전제 조건**:
- Phase 1-3 완료
- Phase 4.1 워크플로우 엔진 완료
- RBAC 시스템 구축 완료

## 기능 요구사항

### 1. 리드 일괄 작업

**지원 작업**:
- ✅ 상태 변경 (`new` → `contacted` → `qualified` → `converted`)
- ✅ 태그 추가/제거
- ✅ 담당자 할당
- ✅ 삭제
- ✅ 메모 추가

**제약사항**:
- 최대 1000개 리드 동시 처리
- 작업 실패 시 부분 성공 허용 (트랜잭션 분리)
- 진행 상황 실시간 표시

### 2. 회사 일괄 작업

**지원 작업**:
- ✅ 상태 변경 (`active`, `churned`, `paused`)
- ✅ 태그 추가/제거
- ✅ 헬스 스코어 재계산
- ✅ 노트 추가
- ✅ 담당 CS 매니저 할당

**제약사항**:
- 최대 500개 회사 동시 처리
- 상태 변경 시 구독 상태와 일치 검증
- 헬스 스코어 재계산은 비동기 처리

### 3. 구독 일괄 작업

**지원 작업**:
- ✅ 플랜 변경
- ✅ 결제 주기 변경 (`monthly` ↔ `yearly`)
- ✅ 상태 변경 (`active`, `paused`, `cancelled`)
- ✅ 다음 결제일 연장

**제약사항**:
- 최대 200개 구독 동시 처리
- 플랜 변경 시 가격 차이 계산 및 경고
- 결제 주기 변경 시 프로레이션 계산

## 데이터베이스 설계

### 일괄 작업 로그 테이블

```sql
CREATE TABLE bulk_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'company', 'subscription')),
  operation TEXT NOT NULL,
  entity_ids UUID[] NOT NULL,
  parameters JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  total_count INTEGER NOT NULL,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bulk_operation_entity_type ON bulk_operation_logs(entity_type);
CREATE INDEX idx_bulk_operation_status ON bulk_operation_logs(status);
CREATE INDEX idx_bulk_operation_executed_by ON bulk_operation_logs(executed_by);
CREATE INDEX idx_bulk_operation_started_at ON bulk_operation_logs(started_at DESC);

COMMENT ON TABLE bulk_operation_logs IS 'Logs of bulk operations performed by admins';
COMMENT ON COLUMN bulk_operation_logs.entity_ids IS 'Array of entity IDs affected by the operation';
COMMENT ON COLUMN bulk_operation_logs.parameters IS 'Operation-specific parameters (e.g., {status: "contacted", assignee_id: "..."})';
COMMENT ON COLUMN bulk_operation_logs.error_details IS 'Array of error objects for failed items: [{entity_id, error_message}]';
```

## TypeScript 타입 정의

**`src/types/bulk.ts`** (신규 생성)

```typescript
// Entity Types
export type BulkEntityType = 'lead' | 'company' | 'subscription'

// Operation Types by Entity
export type LeadBulkOperation =
  | 'change_status'
  | 'add_tags'
  | 'remove_tags'
  | 'assign'
  | 'delete'
  | 'add_note'

export type CompanyBulkOperation =
  | 'change_status'
  | 'add_tags'
  | 'remove_tags'
  | 'recalculate_health'
  | 'add_note'
  | 'assign_cs_manager'

export type SubscriptionBulkOperation =
  | 'change_plan'
  | 'change_billing_cycle'
  | 'change_status'
  | 'extend_next_billing'

// Parameters by Operation
export interface ChangeStatusParams {
  status: string
}

export interface TagParams {
  tags: string[]
}

export interface AssignParams {
  assignee_id: string
}

export interface DeleteParams {
  confirm: boolean
}

export interface AddNoteParams {
  note: string
}

export interface AssignCSManagerParams {
  cs_manager_id: string
}

export interface ChangePlanParams {
  plan_id: string
  effective_date?: string // ISO date
  prorate?: boolean
}

export interface ChangeBillingCycleParams {
  billing_cycle: 'monthly' | 'yearly'
  effective_date?: string
}

export interface ExtendNextBillingParams {
  days: number
}

// Bulk Operation Request
export interface BulkOperationRequest {
  entity_type: BulkEntityType
  operation: string // Union of operation types
  entity_ids: string[]
  parameters: Record<string, any>
}

// Bulk Operation Log
export interface BulkOperationLog {
  id: string
  entity_type: BulkEntityType
  operation: string
  entity_ids: string[]
  parameters: Record<string, any>
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_count: number
  success_count: number
  failed_count: number
  error_details: Array<{
    entity_id: string
    error_message: string
  }>
  executed_by?: string
  started_at: string
  completed_at?: string
  created_at: string
}

// Bulk Operation Response
export interface BulkOperationResponse {
  success: boolean
  operation_id: string
  total_count: number
  success_count: number
  failed_count: number
  errors?: Array<{
    entity_id: string
    error_message: string
  }>
  message?: string
}

// Bulk Operation Progress
export interface BulkOperationProgress {
  operation_id: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  total_count: number
  processed_count: number
  success_count: number
  failed_count: number
  percentage: number
}
```

## API 엔드포인트 설계

### 1. 리드 일괄 작업

**`POST /api/admin/bulk/leads`**

```typescript
// Request Body
{
  operation: 'change_status' | 'add_tags' | 'remove_tags' | 'assign' | 'delete' | 'add_note',
  lead_ids: string[],
  parameters: {
    // operation-specific parameters
    status?: string,
    tags?: string[],
    assignee_id?: string,
    note?: string,
    confirm?: boolean
  }
}

// Response
{
  success: boolean,
  operation_id: string,
  total_count: number,
  success_count: number,
  failed_count: number,
  errors?: [{
    entity_id: string,
    error_message: string
  }]
}
```

**예시**:
```typescript
// 리드 상태 일괄 변경
POST /api/admin/bulk/leads
{
  operation: 'change_status',
  lead_ids: ['uuid1', 'uuid2', 'uuid3'],
  parameters: {
    status: 'contacted'
  }
}

// 리드 태그 일괄 추가
POST /api/admin/bulk/leads
{
  operation: 'add_tags',
  lead_ids: ['uuid1', 'uuid2'],
  parameters: {
    tags: ['high-priority', 'q1-2025']
  }
}
```

### 2. 회사 일괄 작업

**`POST /api/admin/bulk/companies`**

```typescript
// Request Body
{
  operation: 'change_status' | 'add_tags' | 'remove_tags' | 'recalculate_health' | 'add_note' | 'assign_cs_manager',
  company_ids: string[],
  parameters: {
    status?: string,
    tags?: string[],
    note?: string,
    cs_manager_id?: string
  }
}

// Response (same as leads)
```

**예시**:
```typescript
// 회사 헬스 스코어 재계산
POST /api/admin/bulk/companies
{
  operation: 'recalculate_health',
  company_ids: ['uuid1', 'uuid2', 'uuid3'],
  parameters: {}
}

// CS 매니저 일괄 할당
POST /api/admin/bulk/companies
{
  operation: 'assign_cs_manager',
  company_ids: ['uuid1', 'uuid2'],
  parameters: {
    cs_manager_id: 'manager-uuid'
  }
}
```

### 3. 구독 일괄 작업

**`POST /api/admin/bulk/subscriptions`**

```typescript
// Request Body
{
  operation: 'change_plan' | 'change_billing_cycle' | 'change_status' | 'extend_next_billing',
  subscription_ids: string[],
  parameters: {
    plan_id?: string,
    billing_cycle?: 'monthly' | 'yearly',
    status?: string,
    days?: number,
    effective_date?: string,
    prorate?: boolean
  }
}

// Response (same as above)
```

**예시**:
```typescript
// 구독 플랜 일괄 변경
POST /api/admin/bulk/subscriptions
{
  operation: 'change_plan',
  subscription_ids: ['uuid1', 'uuid2'],
  parameters: {
    plan_id: 'plan-premium',
    effective_date: '2025-02-01',
    prorate: true
  }
}

// 다음 결제일 연장
POST /api/admin/bulk/subscriptions
{
  operation: 'extend_next_billing',
  subscription_ids: ['uuid1', 'uuid2', 'uuid3'],
  parameters: {
    days: 30
  }
}
```

### 4. 일괄 작업 로그 조회

**`GET /api/admin/bulk/operations`**

```typescript
// Query Parameters
?entity_type=lead&status=completed&limit=50&offset=0

// Response
{
  operations: BulkOperationLog[],
  total: number
}
```

**`GET /api/admin/bulk/operations/[id]`**

```typescript
// Response
{
  operation: BulkOperationLog
}
```

## 비즈니스 로직 설계

### 배치 처리 전략

```typescript
// src/lib/bulk/bulkProcessor.ts

export class BulkProcessor {
  private static BATCH_SIZE = 100 // 100개씩 배치 처리

  async processOperation(
    entityType: BulkEntityType,
    operation: string,
    entityIds: string[],
    parameters: Record<string, any>,
    executedBy: string
  ): Promise<BulkOperationResponse> {
    // 1. 로그 생성
    const log = await this.createLog({
      entity_type: entityType,
      operation,
      entity_ids: entityIds,
      parameters,
      total_count: entityIds.length,
      executed_by: executedBy,
      status: 'processing'
    })

    // 2. 배치 처리
    const errors: Array<{entity_id: string, error_message: string}> = []
    let successCount = 0

    for (let i = 0; i < entityIds.length; i += this.BATCH_SIZE) {
      const batch = entityIds.slice(i, i + this.BATCH_SIZE)

      for (const entityId of batch) {
        try {
          await this.processEntity(entityType, operation, entityId, parameters)
          successCount++
        } catch (error) {
          errors.push({
            entity_id: entityId,
            error_message: error instanceof Error ? error.message : 'Unknown error'
          })
        }
      }
    }

    // 3. 로그 업데이트
    await this.updateLog(log.id, {
      status: errors.length === 0 ? 'completed' : 'failed',
      success_count: successCount,
      failed_count: errors.length,
      error_details: errors,
      completed_at: new Date().toISOString()
    })

    return {
      success: errors.length === 0,
      operation_id: log.id,
      total_count: entityIds.length,
      success_count: successCount,
      failed_count: errors.length,
      errors: errors.length > 0 ? errors : undefined
    }
  }

  private async processEntity(
    entityType: BulkEntityType,
    operation: string,
    entityId: string,
    parameters: Record<string, any>
  ): Promise<void> {
    switch (entityType) {
      case 'lead':
        return this.processLead(operation, entityId, parameters)
      case 'company':
        return this.processCompany(operation, entityId, parameters)
      case 'subscription':
        return this.processSubscription(operation, entityId, parameters)
      default:
        throw new Error(`Unknown entity type: ${entityType}`)
    }
  }
}
```

### 작업별 처리 로직

#### 리드 작업

```typescript
private async processLead(
  operation: string,
  leadId: string,
  parameters: Record<string, any>
): Promise<void> {
  switch (operation) {
    case 'change_status':
      await supabase
        .from('leads')
        .update({ status: parameters.status })
        .eq('id', leadId)
      break

    case 'add_tags':
      const { data: lead } = await supabase
        .from('leads')
        .select('tags')
        .eq('id', leadId)
        .single()

      const currentTags = lead?.tags || []
      const newTags = Array.from(new Set([...currentTags, ...parameters.tags]))

      await supabase
        .from('leads')
        .update({ tags: newTags })
        .eq('id', leadId)
      break

    case 'remove_tags':
      const { data: leadData } = await supabase
        .from('leads')
        .select('tags')
        .eq('id', leadId)
        .single()

      const filteredTags = (leadData?.tags || []).filter(
        tag => !parameters.tags.includes(tag)
      )

      await supabase
        .from('leads')
        .update({ tags: filteredTags })
        .eq('id', leadId)
      break

    case 'assign':
      await supabase
        .from('leads')
        .update({ assigned_to: parameters.assignee_id })
        .eq('id', leadId)
      break

    case 'delete':
      if (parameters.confirm) {
        await supabase
          .from('leads')
          .delete()
          .eq('id', leadId)
      } else {
        throw new Error('Delete operation requires confirmation')
      }
      break

    case 'add_note':
      // Assuming leads table has notes JSONB field
      // Or create separate notes table
      await supabase
        .from('lead_notes')
        .insert({
          lead_id: leadId,
          note: parameters.note,
          created_by: parameters.created_by
        })
      break

    default:
      throw new Error(`Unknown lead operation: ${operation}`)
  }
}
```

#### 회사 작업

```typescript
private async processCompany(
  operation: string,
  companyId: string,
  parameters: Record<string, any>
): Promise<void> {
  switch (operation) {
    case 'change_status':
      await supabase
        .from('companies')
        .update({ status: parameters.status })
        .eq('id', companyId)
      break

    case 'recalculate_health':
      // Import health score calculation
      const { calculateHealthScore } = await import('@/lib/health/calculateHealthScore')
      const healthScore = await calculateHealthScore(companyId, supabase)

      // Save to health_scores table
      await supabase.from('health_scores').insert({
        company_id: companyId,
        overall_score: healthScore.overall_score,
        engagement_score: healthScore.engagement_score,
        product_usage_score: healthScore.product_usage_score,
        support_score: healthScore.support_score,
        payment_score: healthScore.payment_score,
        health_status: healthScore.health_status,
        risk_factors: healthScore.risk_factors,
        recommendations: healthScore.recommendations
      })
      break

    // ... 다른 작업들
  }
}
```

## UI 컴포넌트 설계

### 1. 일괄 작업 선택 UI

**각 엔티티 목록 페이지에 추가**:

```tsx
// src/components/bulk/BulkActionBar.tsx

interface BulkActionBarProps {
  entityType: 'lead' | 'company' | 'subscription'
  selectedIds: string[]
  onActionComplete: () => void
}

export function BulkActionBar({
  entityType,
  selectedIds,
  onActionComplete
}: BulkActionBarProps) {
  const [operation, setOperation] = useState<string>('')
  const [showModal, setShowModal] = useState(false)

  const operations = getOperationsForEntityType(entityType)

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-white shadow-lg rounded-lg p-4 flex items-center gap-4">
      <span className="text-sm font-medium">
        {selectedIds.length}개 선택됨
      </span>

      <select
        value={operation}
        onChange={(e) => setOperation(e.target.value)}
        className="px-3 py-2 border rounded"
      >
        <option value="">작업 선택...</option>
        {operations.map(op => (
          <option key={op.value} value={op.value}>
            {op.label}
          </option>
        ))}
      </select>

      <button
        onClick={() => setShowModal(true)}
        disabled={!operation}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
      >
        실행
      </button>

      {showModal && (
        <BulkOperationModal
          entityType={entityType}
          operation={operation}
          selectedIds={selectedIds}
          onClose={() => setShowModal(false)}
          onComplete={onActionComplete}
        />
      )}
    </div>
  )
}
```

### 2. 일괄 작업 모달

```tsx
// src/components/bulk/BulkOperationModal.tsx

interface BulkOperationModalProps {
  entityType: BulkEntityType
  operation: string
  selectedIds: string[]
  onClose: () => void
  onComplete: () => void
}

export function BulkOperationModal({
  entityType,
  operation,
  selectedIds,
  onClose,
  onComplete
}: BulkOperationModalProps) {
  const [parameters, setParameters] = useState<Record<string, any>>({})
  const [executing, setExecuting] = useState(false)
  const [progress, setProgress] = useState<BulkOperationProgress | null>(null)

  async function handleExecute() {
    setExecuting(true)

    try {
      const response = await fetch(`/api/admin/bulk/${entityType}s`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          operation,
          [`${entityType}_ids`]: selectedIds,
          parameters
        })
      })

      const result = await response.json()

      if (result.success) {
        alert(`성공: ${result.success_count}/${result.total_count}`)
        onComplete()
        onClose()
      } else {
        alert(`일부 실패: ${result.failed_count}개 항목 처리 실패`)
      }
    } catch (error) {
      alert('일괄 작업 중 오류가 발생했습니다')
    } finally {
      setExecuting(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">일괄 작업 실행</h2>

        <div className="mb-4">
          <p className="text-sm text-gray-600">
            {selectedIds.length}개 항목에 "{operation}" 작업을 실행합니다.
          </p>
        </div>

        {/* Operation-specific parameter inputs */}
        <OperationParameterInputs
          operation={operation}
          parameters={parameters}
          onChange={setParameters}
        />

        <div className="mt-6 flex gap-2">
          <button
            onClick={onClose}
            disabled={executing}
            className="flex-1 px-4 py-2 border rounded hover:bg-gray-50"
          >
            취소
          </button>
          <button
            onClick={handleExecute}
            disabled={executing}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {executing ? '실행 중...' : '실행'}
          </button>
        </div>
      </div>
    </div>
  )
}
```

### 3. 일괄 작업 로그 페이지

```tsx
// src/app/admin/bulk-operations/page.tsx

export default function BulkOperationsPage() {
  const [logs, setLogs] = useState<BulkOperationLog[]>([])
  const [filters, setFilters] = useState({
    entity_type: 'all',
    status: 'all'
  })

  useEffect(() => {
    fetchLogs()
  }, [filters])

  async function fetchLogs() {
    const params = new URLSearchParams({
      entity_type: filters.entity_type,
      status: filters.status
    })

    const response = await fetch(`/api/admin/bulk/operations?${params}`)
    const data = await response.json()
    setLogs(data.operations)
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">일괄 작업 로그</h1>

      {/* Filters */}
      <div className="mb-6 flex gap-4">
        <select
          value={filters.entity_type}
          onChange={(e) => setFilters({...filters, entity_type: e.target.value})}
          className="px-3 py-2 border rounded"
        >
          <option value="all">전체 유형</option>
          <option value="lead">리드</option>
          <option value="company">회사</option>
          <option value="subscription">구독</option>
        </select>

        <select
          value={filters.status}
          onChange={(e) => setFilters({...filters, status: e.target.value})}
          className="px-3 py-2 border rounded"
        >
          <option value="all">전체 상태</option>
          <option value="completed">완료</option>
          <option value="failed">실패</option>
        </select>
      </div>

      {/* Logs Table */}
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-50">
            <th className="px-4 py-2">유형</th>
            <th className="px-4 py-2">작업</th>
            <th className="px-4 py-2">대상 개수</th>
            <th className="px-4 py-2">성공/실패</th>
            <th className="px-4 py-2">상태</th>
            <th className="px-4 py-2">실행 시간</th>
          </tr>
        </thead>
        <tbody>
          {logs.map(log => (
            <tr key={log.id} className="border-t hover:bg-gray-50">
              <td className="px-4 py-2">{log.entity_type}</td>
              <td className="px-4 py-2">{log.operation}</td>
              <td className="px-4 py-2">{log.total_count}</td>
              <td className="px-4 py-2">
                {log.success_count} / {log.failed_count}
              </td>
              <td className="px-4 py-2">
                <span className={`px-2 py-1 rounded text-xs ${
                  log.status === 'completed' ? 'bg-green-100 text-green-800' :
                  log.status === 'failed' ? 'bg-red-100 text-red-800' :
                  'bg-yellow-100 text-yellow-800'
                }`}>
                  {log.status}
                </span>
              </td>
              <td className="px-4 py-2">
                {new Date(log.started_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
```

## 보안 고려사항

1. **권한 검증**: 각 엔티티별 MANAGE 권한 필수
2. **삭제 확인**: 삭제 작업 시 명시적 확인 필요 (`confirm: true`)
3. **Rate Limiting**: 사용자당 분당 5회 일괄 작업 제한
4. **Audit Logging**: 모든 일괄 작업 로그 기록 및 추적

## 성능 최적화

1. **배치 처리**: 100개씩 배치로 나누어 처리
2. **병렬 처리**: 동일 배치 내에서도 가능한 경우 병렬 실행
3. **트랜잭션 분리**: 개별 항목 실패가 전체 작업에 영향 주지 않도록
4. **진행 상황 표시**: 실시간 진행률 업데이트 (WebSocket 또는 폴링)

## 구현 순서

1. **Day 1**:
   - DB 마이그레이션 (`bulk_operation_logs`)
   - TypeScript 타입 정의 (`src/types/bulk.ts`)
   - Bulk Processor 클래스 (`src/lib/bulk/bulkProcessor.ts`)

2. **Day 2**:
   - API 엔드포인트 구현 (leads, companies, subscriptions)
   - 작업 로그 조회 API

3. **Day 3**:
   - UI 컴포넌트 통합 (체크박스, 액션 바, 모달)
   - 일괄 작업 로그 페이지
   - 테스트 및 검증

## 테스트 계획

- **단위 테스트**: 각 작업별 처리 로직
- **통합 테스트**: 100개 항목 일괄 처리
- **부하 테스트**: 1000개 항목 동시 처리
- **실패 시나리오**: 일부 실패 시 나머지 계속 처리 검증
