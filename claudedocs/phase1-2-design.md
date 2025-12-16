# Phase 1.2: 감사 로그 시스템 설계

## 📋 개요

관리자의 모든 중요 작업을 자동으로 기록하고 추적하는 감사 로그 시스템을 구현합니다.

**목표**:
- 모든 관리자 작업의 완전한 감사 추적
- 보안 및 컴플라이언스 요구사항 충족
- 문제 발생 시 디버깅 및 추적 지원
- 사용자 행동 패턴 분석 기반 제공

**예상 소요 시간**: 3-4시간

---

## 🏗️ 시스템 아키텍처

### 1. 데이터 흐름

```
사용자 작업
    ↓
미들웨어 (자동 로깅)
    ↓
Audit Log API
    ↓
audit_logs 테이블
    ↓
Admin UI (조회/필터링)
```

### 2. 주요 컴포넌트

1. **Audit Logging Middleware**: 모든 API 요청 자동 로깅
2. **Audit Log API**: 로그 생성/조회 엔드포인트
3. **Audit Log UI**: 관리자 페이지에서 로그 조회 및 필터링
4. **Utility Functions**: 로그 생성 헬퍼 함수

---

## 📊 데이터 모델

### audit_logs 테이블 (기존)

이미 생성된 테이블을 활용:

```sql
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  action TEXT NOT NULL,
  entity_type TEXT,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### TypeScript 인터페이스

```typescript
interface AuditLog {
  id: string
  userId: string | null
  companyId: string | null
  action: string
  entityType: string | null
  entityId: string | null
  metadata: Record<string, any>
  ipAddress: string | null
  userAgent: string | null
  createdAt: string
}

// 로그 생성 파라미터
interface CreateAuditLogParams {
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
  userId?: string
  companyId?: string
}

// 로그 조회 필터
interface AuditLogFilters {
  userId?: string
  companyId?: string
  action?: string
  entityType?: string
  startDate?: string
  endDate?: string
  limit?: number
  offset?: number
}
```

---

## 🔌 API 엔드포인트 설계

### 1. 감사 로그 조회

**Endpoint**: `GET /api/admin/audit-logs`

**Query Parameters**:
- `userId` (optional): 특정 사용자 필터링
- `companyId` (optional): 특정 회사 필터링
- `action` (optional): 특정 작업 필터링
- `entityType` (optional): 엔티티 타입 필터링
- `startDate` (optional): 시작 날짜
- `endDate` (optional): 종료 날짜
- `limit` (optional, default: 50): 페이지 크기
- `offset` (optional, default: 0): 페이지 오프셋

**Response**:
```typescript
{
  logs: AuditLog[]
  total: number
  limit: number
  offset: number
}
```

### 2. 감사 로그 생성

**Endpoint**: `POST /api/admin/audit-logs`

**Request Body**:
```typescript
{
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
}
```

**Response**:
```typescript
{
  success: boolean
  log: AuditLog
}
```

### 3. 감사 로그 통계

**Endpoint**: `GET /api/admin/audit-logs/stats`

**Query Parameters**:
- `startDate` (optional): 시작 날짜
- `endDate` (optional): 종료 날짜

**Response**:
```typescript
{
  totalLogs: number
  actionBreakdown: {
    action: string
    count: number
  }[]
  userBreakdown: {
    userId: string
    userName: string
    count: number
  }[]
  dailyActivity: {
    date: string
    count: number
  }[]
}
```

---

## 🛠️ 구현 세부사항

### 1. 감사 로그 미들웨어

**파일**: `src/lib/admin/audit-middleware.ts`

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export interface AuditContext {
  userId?: string
  companyId?: string
  action: string
  entityType?: string
  entityId?: string
  metadata?: Record<string, any>
}

export async function createAuditLog(
  request: NextRequest,
  context: AuditContext
) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ipAddress = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  const { error } = await supabase.from('audit_logs').insert({
    user_id: context.userId || null,
    company_id: context.companyId || null,
    action: context.action,
    entity_type: context.entityType || null,
    entity_id: context.entityId || null,
    metadata: context.metadata || {},
    ip_address: ipAddress,
    user_agent: userAgent,
  })

  if (error) {
    console.error('Failed to create audit log:', error)
  }
}

// 주요 작업 상수
export const AUDIT_ACTIONS = {
  // 회사 관리
  COMPANY_CREATE: 'company.create',
  COMPANY_UPDATE: 'company.update',
  COMPANY_DELETE: 'company.delete',
  COMPANY_ACTIVATE: 'company.activate',
  COMPANY_DEACTIVATE: 'company.deactivate',

  // 사용자 관리
  USER_CREATE: 'user.create',
  USER_UPDATE: 'user.update',
  USER_DELETE: 'user.delete',
  USER_ROLE_CHANGE: 'user.role_change',

  // 구독 관리
  SUBSCRIPTION_CREATE: 'subscription.create',
  SUBSCRIPTION_UPDATE: 'subscription.update',
  SUBSCRIPTION_CANCEL: 'subscription.cancel',

  // 설정 변경
  SETTINGS_UPDATE: 'settings.update',

  // 데이터 내보내기
  DATA_EXPORT: 'data.export',

  // 로그인/로그아웃
  ADMIN_LOGIN: 'admin.login',
  ADMIN_LOGOUT: 'admin.logout',
} as const
```

### 2. API 라우트 핸들러

**파일**: `src/app/api/admin/audit-logs/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

export async function GET(request: NextRequest) {
  // 권한 확인
  const adminUser = await getSuperAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 쿼리 파라미터 파싱
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('userId')
  const companyId = searchParams.get('companyId')
  const action = searchParams.get('action')
  const entityType = searchParams.get('entityType')
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')
  const limit = parseInt(searchParams.get('limit') || '50')
  const offset = parseInt(searchParams.get('offset') || '0')

  // 쿼리 빌드
  let query = supabase
    .from('audit_logs')
    .select('*, users:user_id(full_name, email), companies:company_id(name)', {
      count: 'exact',
    })

  if (userId) query = query.eq('user_id', userId)
  if (companyId) query = query.eq('company_id', companyId)
  if (action) query = query.eq('action', action)
  if (entityType) query = query.eq('entity_type', entityType)
  if (startDate) query = query.gte('created_at', startDate)
  if (endDate) query = query.lte('created_at', endDate)

  query = query.order('created_at', { ascending: false })
  query = query.range(offset, offset + limit - 1)

  const { data: logs, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    logs: logs || [],
    total: count || 0,
    limit,
    offset,
  })
}

export async function POST(request: NextRequest) {
  // 권한 확인
  const adminUser = await getSuperAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { action, entityType, entityId, metadata } = body

  if (!action) {
    return NextResponse.json(
      { error: 'Action is required' },
      { status: 400 }
    )
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const ipAddress = request.headers.get('x-forwarded-for') ||
                   request.headers.get('x-real-ip') ||
                   'unknown'
  const userAgent = request.headers.get('user-agent') || 'unknown'

  const { data: log, error } = await supabase
    .from('audit_logs')
    .insert({
      user_id: adminUser.user.id,
      company_id: adminUser.profile.company_id || null,
      action,
      entity_type: entityType || null,
      entity_id: entityId || null,
      metadata: metadata || {},
      ip_address: ipAddress,
      user_agent: userAgent,
    })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, log })
}
```

### 3. 통계 API

**파일**: `src/app/api/admin/audit-logs/stats/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSuperAdminUser } from '@/lib/admin/permissions'

export async function GET(request: NextRequest) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { searchParams } = new URL(request.url)
  const startDate = searchParams.get('startDate')
  const endDate = searchParams.get('endDate')

  // 총 로그 수
  let countQuery = supabase.from('audit_logs').select('*', { count: 'exact', head: true })
  if (startDate) countQuery = countQuery.gte('created_at', startDate)
  if (endDate) countQuery = countQuery.lte('created_at', endDate)
  const { count: totalLogs } = await countQuery

  // 작업별 분류
  let actionQuery = supabase
    .from('audit_logs')
    .select('action')
  if (startDate) actionQuery = actionQuery.gte('created_at', startDate)
  if (endDate) actionQuery = actionQuery.lte('created_at', endDate)
  const { data: actions } = await actionQuery

  const actionBreakdown = Object.entries(
    (actions || []).reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  ).map(([action, count]) => ({ action, count }))

  // 일별 활동
  let dailyQuery = supabase
    .from('audit_logs')
    .select('created_at')
  if (startDate) dailyQuery = dailyQuery.gte('created_at', startDate)
  if (endDate) dailyQuery = dailyQuery.lte('created_at', endDate)
  const { data: dailyData } = await dailyQuery

  const dailyActivity = Object.entries(
    (dailyData || []).reduce((acc, log) => {
      const date = new Date(log.created_at).toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  )
    .map(([date, count]) => ({ date, count }))
    .sort((a, b) => a.date.localeCompare(b.date))

  return NextResponse.json({
    totalLogs: totalLogs || 0,
    actionBreakdown,
    dailyActivity,
  })
}
```

---

## 🎨 UI 컴포넌트 설계

### 1. 감사 로그 페이지

**파일**: `src/app/admin/audit-logs/page.tsx`

**기능**:
- 감사 로그 목록 테이블 (페이지네이션)
- 필터링 (사용자, 회사, 작업, 날짜 범위)
- 검색
- 로그 상세 보기 모달
- CSV 내보내기

**레이아웃**:
```
┌─────────────────────────────────────────┐
│ 감사 로그                                │
│ 모든 관리자 작업 기록                    │
├─────────────────────────────────────────┤
│ [필터] [검색] [날짜 범위] [CSV 내보내기]  │
├─────────────────────────────────────────┤
│ ┌─────────────────────────────────────┐ │
│ │ 날짜/시간 | 사용자 | 작업 | 대상   │ │
│ │ 2025-12-16 14:30 | 홍길동 | ...   │ │
│ │ ...                                 │ │
│ └─────────────────────────────────────┘ │
│ [이전] 페이지 1/10 [다음]                │
└─────────────────────────────────────────┘
```

### 2. 주요 컴포넌트

#### AuditLogsTable
- 로그 목록 테이블
- 정렬 기능
- 행 클릭 시 상세 모달

#### AuditLogFilters
- 사용자 선택 드롭다운
- 작업 타입 선택
- 날짜 범위 선택
- 필터 초기화 버튼

#### AuditLogDetailModal
- 로그 상세 정보
- metadata JSON 뷰어
- IP 주소, User Agent 정보
- 타임스탬프

#### AuditLogStats
- 일별 활동 차트
- 작업 타입별 분포 파이 차트
- 주요 통계 카드

---

## 🔄 자동 로깅 통합

### 기존 API에 로깅 추가

**예시**: 회사 업데이트 API에 감사 로그 추가

```typescript
// src/app/api/admin/companies/[id]/route.ts

import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminUser = await getSuperAdminUser()
  if (!adminUser) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()

  // ... 회사 업데이트 로직 ...

  // 감사 로그 생성
  await createAuditLog(request, {
    userId: adminUser.user.id,
    action: AUDIT_ACTIONS.COMPANY_UPDATE,
    entityType: 'company',
    entityId: params.id,
    metadata: {
      changes: body,
      previousState: originalCompany, // 변경 전 상태
    },
  })

  return NextResponse.json({ success: true, company: updatedCompany })
}
```

### 주요 로깅 대상

1. **회사 관리**: 생성, 수정, 삭제, 활성화/비활성화
2. **사용자 관리**: 생성, 수정, 삭제, 역할 변경
3. **구독 관리**: 생성, 업데이트, 취소
4. **결제 관리**: 환불, 조정
5. **설정 변경**: 시스템 설정 수정
6. **데이터 내보내기**: CSV, Excel 다운로드
7. **로그인/로그아웃**: 관리자 인증 이벤트

---

## 🎯 성공 기준

### 기능적 요구사항
- [x] 모든 관리자 작업 자동 로깅
- [x] 로그 조회 및 필터링 UI
- [x] 로그 검색 기능
- [x] 로그 통계 대시보드
- [x] CSV 내보내기 기능

### 비기능적 요구사항
- [ ] 로그 조회 응답 시간 < 500ms
- [ ] 로깅으로 인한 API 지연 < 50ms
- [ ] 로그 데이터 90일 보관
- [ ] 페이지네이션으로 대량 데이터 처리

---

## 📝 구현 체크리스트

### 백엔드
- [ ] 감사 로그 미들웨어 구현
- [ ] GET /api/admin/audit-logs 구현
- [ ] POST /api/admin/audit-logs 구현
- [ ] GET /api/admin/audit-logs/stats 구현
- [ ] 주요 API에 자동 로깅 통합

### 프론트엔드
- [ ] 감사 로그 페이지 구현
- [ ] 로그 테이블 컴포넌트
- [ ] 필터링 UI 컴포넌트
- [ ] 로그 상세 모달
- [ ] 통계 대시보드 컴포넌트
- [ ] CSV 내보내기 기능

### 통합 및 테스트
- [ ] 네비게이션에 감사 로그 메뉴 추가
- [ ] 권한 확인 테스트
- [ ] 필터링 기능 테스트
- [ ] 페이지네이션 테스트
- [ ] 성능 테스트

---

## 🔜 다음 단계

Phase 1.2 완료 후:
- **Phase 1.3**: 역할 기반 접근 제어 (RBAC) 구현
- **Phase 1.4**: 기본 API 엔드포인트 구현

---

## 📚 참고 사항

### 보안 고려사항
- 민감한 데이터는 metadata에 저장하지 않음
- IP 주소 및 User Agent 정보 수집 (GDPR 고려)
- 관리자만 로그 조회 가능
- 로그는 삭제 불가능 (immutable)

### 성능 최적화
- 인덱스 활용 (user_id, company_id, created_at, action)
- 페이지네이션으로 대량 데이터 처리
- 통계 쿼리 최적화 (집계 함수 활용)

### 확장 가능성
- 향후 로그 아카이빙 시스템 (S3, BigQuery 등)
- 로그 분석 및 이상 탐지
- 실시간 알림 (의심스러운 활동 감지)
