# Phase 1.4: 기본 API 엔드포인트 설계

## 📋 개요

Phase 1.4는 **기존 Admin API에 RBAC 권한 체크를 통합**하고, **핵심 관리 API를 구현**하여 Phase 1 (기초 인프라)를 완료하는 단계입니다.

---

## 🎯 주요 목표

1. **기존 API 권한 통합**: 모든 기존 Admin API에 RBAC 권한 체크 추가
2. **핵심 API 구현**: 회사/사용자 관리 CRUD API 완성
3. **에러 처리 표준화**: 401/403 에러 일관된 처리
4. **감사 로깅 완성**: 모든 중요 작업 자동 기록

---

## 📐 시스템 아키텍처

### API 레이어 구조

```
Client Request
    ↓
[Next.js API Route]
    ↓
[1. getSuperAdminUser()] → 401 if not admin
    ↓
[2. requirePermission()] → 403 if no permission
    ↓
[3. Business Logic] → Supabase queries
    ↓
[4. createAuditLog()] → Optional, for important actions
    ↓
[5. Response] → JSON
```

---

## 🗄️ 구현 범위

### Part A: 기존 API 권한 통합

현재 존재하는 API 엔드포인트들에 권한 체크 추가:

**대상 확인 필요**:
- 기존 회사 관리 API
- 기존 사용자 관리 API (역할 제외)
- 기존 구독 관리 API
- 기존 리드 관리 API

**작업 내용**:
1. 각 API에 `requirePermission()` 추가
2. 403 Forbidden 에러 핸들링
3. 감사 로그 누락 여부 확인 및 추가

### Part B: 핵심 API 신규 구현

#### 1. 회사 관리 API

**파일 구조**:
```
src/app/api/admin/companies/
├── route.ts              # GET (목록), POST (생성)
└── [id]/
    └── route.ts          # GET (상세), PUT (수정), DELETE (삭제)
```

**API 스펙**:

##### GET /api/admin/companies
**목적**: 전체 회사 목록 조회 (페이지네이션)

**권한**: `VIEW_COMPANIES`

**Query Parameters**:
- `limit`: 페이지 크기 (기본: 50, 최대: 100)
- `offset`: 페이지 오프셋 (기본: 0)
- `search`: 회사명 검색 (부분 일치)
- `status`: 상태 필터 (`active`, `inactive`, `suspended`)
- `sortBy`: 정렬 기준 (`created_at`, `name`, `user_count`)
- `sortOrder`: 정렬 방향 (`asc`, `desc`)

**Response**:
```typescript
{
  success: true,
  companies: Company[],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}

interface Company {
  id: string
  name: string
  slug: string
  created_at: string
  updated_at: string
  status: 'active' | 'inactive' | 'suspended'
  user_count: number
  lead_count: number
  subscription_status?: 'active' | 'trial' | 'cancelled'
}
```

---

##### POST /api/admin/companies
**목적**: 새 회사 생성

**권한**: `MANAGE_COMPANIES`

**Request Body**:
```typescript
{
  name: string,           // 필수
  slug?: string,          // 선택 (미입력 시 name에서 자동 생성)
  status?: 'active' | 'inactive',  // 기본: 'active'
}
```

**Response**:
```typescript
{
  success: true,
  company: Company
}
```

**감사 로그**: `COMPANY_CREATE`

---

##### GET /api/admin/companies/[id]
**목적**: 특정 회사 상세 정보 조회

**권한**: `VIEW_COMPANIES`

**Response**:
```typescript
{
  success: true,
  company: CompanyDetail
}

interface CompanyDetail extends Company {
  users: {
    id: string,
    email: string,
    full_name: string,
    role: string
  }[],
  recent_activity: {
    login_count_30d: number,
    lead_created_30d: number,
    last_activity_at: string
  },
  subscription?: {
    plan: string,
    status: string,
    current_period_end: string
  }
}
```

---

##### PUT /api/admin/companies/[id]
**목적**: 회사 정보 수정

**권한**: `MANAGE_COMPANIES`

**Request Body**:
```typescript
{
  name?: string,
  status?: 'active' | 'inactive' | 'suspended',
}
```

**Response**:
```typescript
{
  success: true,
  company: Company
}
```

**감사 로그**: `COMPANY_UPDATE`

---

##### DELETE /api/admin/companies/[id]
**목적**: 회사 삭제 (소프트 삭제 또는 하드 삭제)

**권한**: `MANAGE_COMPANIES`

**Query Parameters**:
- `hard`: boolean (true면 하드 삭제, 기본: false - 소프트 삭제)

**Response**:
```typescript
{
  success: true,
  deletedCompanyId: string,
  deletionType: 'soft' | 'hard'
}
```

**감사 로그**: `COMPANY_DELETE`

**제약사항**:
- 활성 사용자가 있는 회사는 삭제 불가 (경고 및 에러)
- 활성 구독이 있는 회사는 삭제 불가

---

#### 2. 사용자 관리 API

**파일 구조**:
```
src/app/api/admin/users/
├── route.ts              # GET (목록), POST (생성)
└── [userId]/
    └── route.ts          # GET (상세), PUT (수정), DELETE (삭제)
```

**API 스펙**:

##### GET /api/admin/users
**목적**: 전체 사용자 목록 조회 (페이지네이션)

**권한**: `VIEW_USERS`

**Query Parameters**:
- `limit`: 페이지 크기 (기본: 50, 최대: 100)
- `offset`: 페이지 오프셋 (기본: 0)
- `search`: 이름/이메일 검색
- `companyId`: 특정 회사 사용자만 조회
- `roleFilter`: 역할 필터 (admin role ID)
- `sortBy`: 정렬 기준 (`created_at`, `full_name`, `email`)
- `sortOrder`: 정렬 방향 (`asc`, `desc`)

**Response**:
```typescript
{
  success: true,
  users: User[],
  pagination: PaginationInfo
}

interface User {
  id: string
  email: string
  full_name: string | null
  company_id: string | null
  company_name: string | null
  created_at: string
  last_sign_in_at: string | null
  admin_roles: {
    id: string,
    name: string
  }[]
}
```

---

##### POST /api/admin/users
**목적**: 새 사용자 생성 (관리자용)

**권한**: `MANAGE_USERS`

**Request Body**:
```typescript
{
  email: string,          // 필수
  password: string,       // 필수 (최소 8자)
  full_name?: string,     // 선택
  company_id?: string,    // 선택 (회사 소속)
  role_ids?: string[],    // 선택 (관리자 역할 할당)
}
```

**Response**:
```typescript
{
  success: true,
  user: User
}
```

**감사 로그**: `USER_CREATE`

---

##### GET /api/admin/users/[userId]
**목적**: 특정 사용자 상세 정보 조회

**권한**: `VIEW_USERS`

**Response**:
```typescript
{
  success: true,
  user: UserDetail
}

interface UserDetail extends User {
  profile: {
    full_name: string | null,
    avatar_url: string | null,
  },
  company: {
    id: string,
    name: string
  } | null,
  admin_roles: AdminRole[],
  permissions: string[],
  activity: {
    login_count: number,
    last_login_at: string | null,
    lead_count: number
  }
}
```

---

##### PUT /api/admin/users/[userId]
**목적**: 사용자 정보 수정

**권한**: `MANAGE_USERS`

**Request Body**:
```typescript
{
  email?: string,
  full_name?: string,
  company_id?: string,
  password?: string,      // 비밀번호 재설정 (선택)
}
```

**Response**:
```typescript
{
  success: true,
  user: User
}
```

**감사 로그**: `USER_UPDATE` (비밀번호 변경 시 `USER_PASSWORD_RESET`)

---

##### DELETE /api/admin/users/[userId]
**목적**: 사용자 삭제

**권한**: `MANAGE_USERS`

**Response**:
```typescript
{
  success: true,
  deletedUserId: string
}
```

**감사 로그**: `USER_DELETE`

**제약사항**:
- 자기 자신은 삭제 불가
- 슈퍼 관리자는 다른 슈퍼 관리자를 삭제 불가 (보호)

---

## 🔐 권한 매핑 전체

### 회사 관리 API
| Method | Endpoint | Permission | Audit Action |
|--------|----------|------------|--------------|
| GET | /api/admin/companies | `VIEW_COMPANIES` | - |
| POST | /api/admin/companies | `MANAGE_COMPANIES` | `COMPANY_CREATE` |
| GET | /api/admin/companies/[id] | `VIEW_COMPANIES` | - |
| PUT | /api/admin/companies/[id] | `MANAGE_COMPANIES` | `COMPANY_UPDATE` |
| DELETE | /api/admin/companies/[id] | `MANAGE_COMPANIES` | `COMPANY_DELETE` |

### 사용자 관리 API
| Method | Endpoint | Permission | Audit Action |
|--------|----------|------------|--------------|
| GET | /api/admin/users | `VIEW_USERS` | - |
| POST | /api/admin/users | `MANAGE_USERS` | `USER_CREATE` |
| GET | /api/admin/users/[userId] | `VIEW_USERS` | - |
| PUT | /api/admin/users/[userId] | `MANAGE_USERS` | `USER_UPDATE` |
| DELETE | /api/admin/users/[userId] | `MANAGE_USERS` | `USER_DELETE` |

---

## 🔧 표준 API 템플릿

### 목록 조회 API 템플릿

```typescript
export async function GET(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.VIEW_RESOURCE)

    // 3. 쿼리 파라미터 파싱
    const { searchParams } = new URL(request.url)
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100)
    const offset = parseInt(searchParams.get('offset') || '0')
    const search = searchParams.get('search')

    // 4. Supabase 쿼리
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let query = supabase
      .from('table_name')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // 검색 조건 추가
    if (search) {
      query = query.ilike('name', `%${search}%`)
    }

    const { data, error, count } = await query

    if (error) {
      console.error('[API] Query error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch data' },
        { status: 500 }
      )
    }

    // 5. 응답
    return NextResponse.json({
      success: true,
      data: data || [],
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: (count || 0) > offset + limit,
      },
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### 생성 API 템플릿

```typescript
export async function POST(request: NextRequest) {
  try {
    // 1. 관리자 인증
    const adminUser = await getSuperAdminUser()
    if (!adminUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // 2. 권한 체크
    await requirePermission(adminUser.user.id, PERMISSIONS.MANAGE_RESOURCE)

    // 3. 요청 바디 파싱 및 검증
    const body = await request.json()
    const { requiredField, optionalField } = body

    if (!requiredField) {
      return NextResponse.json(
        { error: 'Missing required field: requiredField' },
        { status: 400 }
      )
    }

    // 4. Supabase Insert
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error } = await supabase
      .from('table_name')
      .insert({
        required_field: requiredField,
        optional_field: optionalField || null,
      })
      .select()
      .single()

    if (error || !data) {
      console.error('[API] Insert error:', error)
      return NextResponse.json(
        { error: 'Failed to create resource' },
        { status: 500 }
      )
    }

    // 5. 감사 로그 생성
    await createAuditLog(request, {
      userId: adminUser.user.id,
      action: AUDIT_ACTIONS.RESOURCE_CREATE,
      entityType: 'resource_type',
      entityId: data.id,
      metadata: {
        name: requiredField,
        createdBy: adminUser.profile.full_name || adminUser.user.email,
      },
    })

    // 6. 응답
    return NextResponse.json({
      success: true,
      data,
    })
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('Permission denied')) {
      return NextResponse.json({ error: error.message }, { status: 403 })
    }

    console.error('[API] Unexpected error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## 📊 에러 처리 표준

### HTTP 상태 코드

- **200 OK**: 성공 (GET, PUT)
- **201 Created**: 생성 성공 (POST)
- **400 Bad Request**: 입력 검증 실패
- **401 Unauthorized**: 인증 실패 (관리자 아님)
- **403 Forbidden**: 권한 부족
- **404 Not Found**: 리소스 없음
- **409 Conflict**: 중복/충돌 (예: 이메일 중복)
- **500 Internal Server Error**: 서버 에러

### 에러 응답 형식

```typescript
// 400 Bad Request
{
  error: string,                    // "Missing required field: email"
  field?: string                    // "email" (선택)
}

// 401 Unauthorized
{
  error: "Unauthorized"
}

// 403 Forbidden
{
  error: "Permission denied: manage_companies"
}

// 404 Not Found
{
  error: "Company not found"
}

// 500 Internal Server Error
{
  error: "Internal server error"
}
```

---

## 🎯 감사 로그 액션 추가

### 기존 액션 확인

Phase 1.2, 1.3에서 이미 추가된 액션:
- 회사: `COMPANY_CREATE`, `COMPANY_UPDATE`, `COMPANY_DELETE`
- 사용자: `USER_CREATE`, `USER_UPDATE`, `USER_DELETE`, `USER_PASSWORD_RESET`
- 역할: `ROLE_CREATE`, `ROLE_UPDATE`, `ROLE_DELETE`, `ROLE_ASSIGN`, `ROLE_UNASSIGN`

### 추가 필요 액션 (있을 경우)

회사/사용자 관련 추가 액션이 필요하면 `audit-middleware.ts`에 추가:
- `COMPANY_ACTIVATE`, `COMPANY_DEACTIVATE`, `COMPANY_SUSPEND`
- `USER_ROLE_CHANGE` (역할 변경)
- `USER_COMPANY_CHANGE` (회사 이동)

---

## 📝 구현 체크리스트

### Part A: 기존 API 권한 통합
- [ ] 기존 API 파일 목록 확인 (`src/app/api/admin/**/route.ts`)
- [ ] 각 API에 `requirePermission()` 추가
- [ ] 403 Forbidden 에러 핸들링 추가
- [ ] 감사 로그 누락 여부 확인 및 추가

### Part B: 회사 관리 API
- [ ] `src/app/api/admin/companies/route.ts` (GET, POST)
- [ ] `src/app/api/admin/companies/[id]/route.ts` (GET, PUT, DELETE)
- [ ] 회사 삭제 시 제약 조건 구현 (활성 사용자/구독 확인)
- [ ] 감사 로그 통합

### Part C: 사용자 관리 API
- [ ] `src/app/api/admin/users/route.ts` (GET, POST) - 역할 제외 부분만
- [ ] `src/app/api/admin/users/[userId]/route.ts` (GET, PUT, DELETE) - 역할 제외 부분만
- [ ] 사용자 삭제 시 제약 조건 (자기 자신, 슈퍼 관리자 보호)
- [ ] 감사 로그 통합

### Documentation
- [ ] `claudedocs/phase1-4-usage.md` - API 사용 가이드
- [ ] API 권한 매핑 문서
- [ ] 에러 처리 가이드

---

## 🎯 완료 기준

- ✅ 모든 기존 Admin API에 RBAC 권한 체크 적용
- ✅ 회사 관리 CRUD API 완성 (5개 엔드포인트)
- ✅ 사용자 관리 CRUD API 완성 (5개 엔드포인트)
- ✅ 401/403 에러 일관된 처리
- ✅ 모든 중요 작업에 감사 로그 생성
- ✅ API 문서 작성 및 사용 가이드 제공

---

## 🔄 다음 단계

Phase 1.4 완료 후:
- **Phase 1 완료**: 기초 인프라 구축 완료 (100%)
- **Phase 2 시작**: 고객 성공 관리 (건강도 계산, 대시보드, 온보딩 추적)
