# Phase 1.4: 기본 API 엔드포인트 사용 가이드

## 📋 개요

Phase 1.4에서 구현된 회사 관리 API 및 사용자 관리 API의 사용 방법을 안내합니다.

---

## 🎯 주요 기능

1. **회사 관리 API**: 회사 CRUD 작업 (5개 엔드포인트)
2. **사용자 관리 API**: 사용자 CRUD 작업 (5개 엔드포인트)
3. **RBAC 권한 통합**: 모든 API에 세분화된 권한 체크 적용
4. **감사 로깅**: 모든 중요 작업 자동 기록

---

## 🏢 회사 관리 API

### 1. 회사 목록 조회

**Endpoint**: `GET /api/admin/companies`

**권한**: `VIEW_COMPANIES`

**Query Parameters**:
- `limit` (number, 선택, 기본: 50, 최대: 100): 페이지 크기
- `offset` (number, 선택, 기본: 0): 페이지 오프셋
- `search` (string, 선택): 회사명 검색 (부분 일치)
- `status` (string, 선택): 상태 필터 (`active`, `inactive`, `suspended`)
- `sortBy` (string, 선택): 정렬 기준 (`created_at`, `name`, `updated_at`)
- `sortOrder` (string, 선택): 정렬 방향 (`asc`, `desc`)

**Response**:
```typescript
{
  success: true,
  companies: [
    {
      id: string,
      name: string,
      slug: string,
      status: 'active' | 'inactive' | 'suspended',
      created_at: string,
      updated_at: string,
      user_count: number,
      lead_count: number,
      subscription_status: 'active' | 'trial' | 'cancelled' | null
    }
  ],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

**Example**:
```typescript
// 활성 회사만 조회, 이름순 정렬
const response = await fetch(
  '/api/admin/companies?status=active&sortBy=name&sortOrder=asc&limit=20'
)
const data = await response.json()
console.log(data.companies) // 활성 회사 목록
```

---

### 2. 회사 생성

**Endpoint**: `POST /api/admin/companies`

**권한**: `MANAGE_COMPANIES`

**Request Body**:
```typescript
{
  name: string,           // 필수
  slug?: string,          // 선택 (미입력 시 name에서 자동 생성)
  status?: 'active' | 'inactive'  // 선택, 기본: 'active'
}
```

**Response**:
```typescript
{
  success: true,
  company: {
    id: string,
    name: string,
    slug: string,
    status: string,
    created_at: string,
    updated_at: string
  }
}
```

**Example**:
```typescript
const response = await fetch('/api/admin/companies', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'Acme Corporation',
    slug: 'acme-corp',  // 선택
    status: 'active'
  })
})

const data = await response.json()
console.log(data.company) // 생성된 회사 정보
```

**에러**:
- `400`: 필수 필드 누락 또는 유효하지 않은 값
- `409`: 동일한 slug를 가진 회사가 이미 존재

---

### 3. 회사 상세 조회

**Endpoint**: `GET /api/admin/companies/[id]`

**권한**: `VIEW_COMPANIES`

**Response**:
```typescript
{
  success: true,
  company: {
    id: string,
    name: string,
    slug: string,
    status: string,
    created_at: string,
    updated_at: string,
    users: [
      {
        id: string,
        email: string,
        full_name: string,
        role: string
      }
    ],
    recent_activity: {
      login_count_30d: number,
      lead_created_30d: number,
      last_activity_at: string | null
    },
    subscription: {
      plan: string,
      status: string,
      current_period_end: string
    } | null
  }
}
```

**Example**:
```typescript
const companyId = 'company-uuid'
const response = await fetch(`/api/admin/companies/${companyId}`)
const data = await response.json()

console.log(data.company.users) // 회사 소속 사용자
console.log(data.company.recent_activity) // 최근 30일 활동
```

---

### 4. 회사 정보 수정

**Endpoint**: `PUT /api/admin/companies/[id]`

**권한**: `MANAGE_COMPANIES`

**Request Body**:
```typescript
{
  name?: string,
  status?: 'active' | 'inactive' | 'suspended'
}
```

**Response**:
```typescript
{
  success: true,
  company: {
    id: string,
    name: string,
    status: string,
    updated_at: string,
    // ... other fields
  }
}
```

**Example**:
```typescript
const response = await fetch(`/api/admin/companies/${companyId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'New Company Name',
    status: 'inactive'
  })
})

const data = await response.json()
console.log(data.company) // 수정된 회사 정보
```

---

### 5. 회사 삭제

**Endpoint**: `DELETE /api/admin/companies/[id]`

**권한**: `MANAGE_COMPANIES`

**Query Parameters**:
- `hard` (boolean, 선택, 기본: false): true면 하드 삭제, false면 소프트 삭제

**Response**:
```typescript
{
  success: true,
  deletedCompanyId: string,
  deletionType: 'soft' | 'hard'
}
```

**Example**:
```typescript
// 소프트 삭제 (status를 'deleted'로 변경)
const response = await fetch(`/api/admin/companies/${companyId}`, {
  method: 'DELETE'
})

// 하드 삭제 (데이터베이스에서 완전 삭제)
const response = await fetch(`/api/admin/companies/${companyId}?hard=true`, {
  method: 'DELETE'
})

const data = await response.json()
console.log(data.deletionType) // 'soft' 또는 'hard'
```

**제약사항**:
- 활성 사용자가 있는 회사는 삭제 불가 → `409 Conflict`
- 활성 구독이 있는 회사는 삭제 불가 → `409 Conflict`

---

## 👤 사용자 관리 API

### 1. 사용자 목록 조회

**Endpoint**: `GET /api/admin/users`

**권한**: `VIEW_USERS`

**Query Parameters**:
- `limit` (number, 선택, 기본: 50, 최대: 100): 페이지 크기
- `offset` (number, 선택, 기본: 0): 페이지 오프셋
- `search` (string, 선택): 이름/이메일 검색
- `companyId` (string, 선택): 특정 회사 사용자만 조회
- `roleFilter` (string, 선택): 역할 ID로 필터링
- `sortBy` (string, 선택): 정렬 기준 (`created_at`, `email`)
- `sortOrder` (string, 선택): 정렬 방향 (`asc`, `desc`)

**Response**:
```typescript
{
  success: true,
  users: [
    {
      id: string,
      email: string,
      full_name: string | null,
      company_id: string | null,
      company_name: string | null,
      created_at: string,
      last_sign_in_at: string | null,
      admin_roles: [
        {
          id: string,
          name: string
        }
      ]
    }
  ],
  pagination: {
    total: number,
    limit: number,
    offset: number,
    hasMore: boolean
  }
}
```

**Example**:
```typescript
// 특정 회사의 사용자만 조회
const response = await fetch(
  `/api/admin/users?companyId=${companyId}&limit=50`
)
const data = await response.json()
console.log(data.users) // 회사 소속 사용자 목록

// 이메일 검색
const response = await fetch('/api/admin/users?search=john@example.com')
```

---

### 2. 사용자 생성

**Endpoint**: `POST /api/admin/users`

**권한**: `MANAGE_USERS`

**Request Body**:
```typescript
{
  email: string,          // 필수
  password: string,       // 필수 (최소 8자)
  full_name?: string,     // 선택
  company_id?: string,    // 선택 (회사 소속)
  role_ids?: string[]     // 선택 (관리자 역할 할당)
}
```

**Response**:
```typescript
{
  success: true,
  user: {
    id: string,
    email: string,
    full_name: string | null,
    company_id: string | null,
    created_at: string
  }
}
```

**Example**:
```typescript
const response = await fetch('/api/admin/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'newuser@example.com',
    password: 'SecurePassword123!',
    full_name: 'John Doe',
    company_id: 'company-uuid',
    role_ids: ['role-uuid-1', 'role-uuid-2']
  })
})

const data = await response.json()
console.log(data.user) // 생성된 사용자 정보
```

**에러**:
- `400`: 필수 필드 누락, 비밀번호 길이 부족 (< 8자)
- `409`: 동일한 이메일을 가진 사용자가 이미 존재

---

### 3. 사용자 상세 조회

**Endpoint**: `GET /api/admin/users/[userId]`

**권한**: `VIEW_USERS`

**Response**:
```typescript
{
  success: true,
  user: {
    id: string,
    email: string,
    created_at: string,
    last_sign_in_at: string | null,
    profile: {
      full_name: string | null,
      avatar_url: string | null
    },
    company: {
      id: string,
      name: string
    } | null,
    admin_roles: [
      {
        id: string,
        code: string,
        name: string,
        permissions: string[]
      }
    ],
    permissions: string[],
    activity: {
      login_count: number,
      last_login_at: string | null,
      lead_count: number
    }
  }
}
```

**Example**:
```typescript
const userId = 'user-uuid'
const response = await fetch(`/api/admin/users/${userId}`)
const data = await response.json()

console.log(data.user.admin_roles) // 할당된 역할 목록
console.log(data.user.permissions) // 모든 권한 합집합
console.log(data.user.activity) // 활동 통계
```

---

### 4. 사용자 정보 수정

**Endpoint**: `PUT /api/admin/users/[userId]`

**권한**: `MANAGE_USERS`

**Request Body**:
```typescript
{
  email?: string,
  full_name?: string,
  company_id?: string,
  password?: string       // 비밀번호 재설정 (선택)
}
```

**Response**:
```typescript
{
  success: true,
  user: {
    id: string,
    email: string,
    created_at: string,
    // ... other fields
  }
}
```

**Example**:
```typescript
// 프로필 정보 수정
const response = await fetch(`/api/admin/users/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    full_name: 'Jane Doe',
    company_id: 'new-company-uuid'
  })
})

// 비밀번호 재설정
const response = await fetch(`/api/admin/users/${userId}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    password: 'NewSecurePassword123!'
  })
})

const data = await response.json()
console.log(data.user) // 수정된 사용자 정보
```

**감사 로그**:
- 일반 수정: `USER_UPDATE`
- 비밀번호 변경: `USER_PASSWORD_RESET`

---

### 5. 사용자 삭제

**Endpoint**: `DELETE /api/admin/users/[userId]`

**권한**: `MANAGE_USERS`

**Response**:
```typescript
{
  success: true,
  deletedUserId: string
}
```

**Example**:
```typescript
const response = await fetch(`/api/admin/users/${userId}`, {
  method: 'DELETE'
})

const data = await response.json()
console.log(data.deletedUserId) // 삭제된 사용자 ID
```

**제약사항**:
- 자기 자신은 삭제 불가 → `403 Forbidden`
- 슈퍼 관리자는 다른 슈퍼 관리자를 삭제 불가 (자신도 슈퍼 관리자가 아닌 경우) → `403 Forbidden`

---

## 🔐 권한 요구사항 전체

### 회사 관리
| Endpoint | Method | Permission |
|----------|--------|------------|
| /api/admin/companies | GET | `VIEW_COMPANIES` |
| /api/admin/companies | POST | `MANAGE_COMPANIES` |
| /api/admin/companies/[id] | GET | `VIEW_COMPANIES` |
| /api/admin/companies/[id] | PUT | `MANAGE_COMPANIES` |
| /api/admin/companies/[id] | DELETE | `MANAGE_COMPANIES` |

### 사용자 관리
| Endpoint | Method | Permission |
|----------|--------|------------|
| /api/admin/users | GET | `VIEW_USERS` |
| /api/admin/users | POST | `MANAGE_USERS` |
| /api/admin/users/[userId] | GET | `VIEW_USERS` |
| /api/admin/users/[userId] | PUT | `MANAGE_USERS` |
| /api/admin/users/[userId] | DELETE | `MANAGE_USERS` |

---

## ⚠️ 에러 처리

### HTTP 상태 코드

- **200 OK**: 성공 (GET, PUT)
- **201 Created**: 생성 성공 (POST)
- **400 Bad Request**: 입력 검증 실패
- **401 Unauthorized**: 인증 실패 (관리자 아님)
- **403 Forbidden**: 권한 부족 또는 제약 조건 위반
- **404 Not Found**: 리소스 없음
- **409 Conflict**: 중복/충돌 (예: 이메일 중복, 삭제 제약)
- **500 Internal Server Error**: 서버 에러

### 에러 응답 형식

```typescript
// 400 Bad Request
{
  error: "Missing required field: name",
  field: "name"  // 선택
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

// 409 Conflict
{
  error: "Cannot delete company with 5 active user(s). Remove or reassign users first."
}

// 500 Internal Server Error
{
  error: "Internal server error"
}
```

---

## 📊 감사 로그

### 회사 관련 액션

- `COMPANY_CREATE`: 회사 생성
- `COMPANY_UPDATE`: 회사 정보 수정
- `COMPANY_DELETE`: 회사 삭제 (소프트/하드)

### 사용자 관련 액션

- `USER_CREATE`: 사용자 생성
- `USER_UPDATE`: 사용자 정보 수정
- `USER_PASSWORD_RESET`: 비밀번호 재설정
- `USER_DELETE`: 사용자 삭제

### 감사 로그 조회

모든 감사 로그는 `/api/admin/audit-logs` API를 통해 조회할 수 있습니다.

```typescript
// 특정 회사의 감사 로그 조회
const response = await fetch(
  `/api/admin/audit-logs?entityType=company&entityId=${companyId}`
)

// 특정 사용자의 감사 로그 조회
const response = await fetch(
  `/api/admin/audit-logs?entityType=user&entityId=${userId}`
)
```

---

## 🔧 프로그래밍 방식 사용

### React 컴포넌트 예제

```typescript
import { useState, useEffect } from 'react'
import { usePermissions } from '@/hooks/usePermissions'
import { PERMISSIONS } from '@/types/rbac'

function CompanyManagementPage() {
  const { hasPermission } = usePermissions()
  const [companies, setCompanies] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchCompanies()
  }, [])

  const fetchCompanies = async () => {
    try {
      const response = await fetch('/api/admin/companies?limit=50')
      const data = await response.json()
      setCompanies(data.companies)
    } catch (error) {
      console.error('Failed to fetch companies:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (companyData) => {
    try {
      const response = await fetch('/api/admin/companies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(companyData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error)
      }

      const data = await response.json()
      setCompanies([...companies, data.company])
    } catch (error) {
      alert(`Failed to create company: ${error.message}`)
    }
  }

  return (
    <div>
      {/* 조회 권한 있으면 목록 표시 */}
      {hasPermission(PERMISSIONS.VIEW_COMPANIES) && (
        <CompanyList companies={companies} loading={loading} />
      )}

      {/* 관리 권한 있으면 생성 버튼 표시 */}
      {hasPermission(PERMISSIONS.MANAGE_COMPANIES) && (
        <CreateCompanyButton onCreate={handleCreate} />
      )}
    </div>
  )
}
```

---

## 📈 모범 사례

### 1. 에러 처리

```typescript
async function deleteCompany(companyId: string) {
  try {
    const response = await fetch(`/api/admin/companies/${companyId}`, {
      method: 'DELETE'
    })

    if (!response.ok) {
      const error = await response.json()

      // 제약 조건 에러 처리
      if (response.status === 409) {
        alert(`Cannot delete: ${error.error}`)
        return
      }

      // 권한 에러 처리
      if (response.status === 403) {
        alert('You do not have permission to delete companies')
        return
      }

      throw new Error(error.error || 'Failed to delete company')
    }

    const data = await response.json()
    console.log(`Company deleted: ${data.deletedCompanyId}`)
  } catch (error) {
    console.error('Delete error:', error)
    alert(`Error: ${error.message}`)
  }
}
```

### 2. 페이지네이션 처리

```typescript
async function loadMoreCompanies(offset: number, limit: number = 50) {
  const response = await fetch(
    `/api/admin/companies?offset=${offset}&limit=${limit}&sortBy=created_at&sortOrder=desc`
  )
  const data = await response.json()

  return {
    companies: data.companies,
    hasMore: data.pagination.hasMore,
    total: data.pagination.total
  }
}

// 무한 스크롤 구현
const [companies, setCompanies] = useState([])
const [offset, setOffset] = useState(0)
const [hasMore, setHasMore] = useState(true)

const loadMore = async () => {
  const result = await loadMoreCompanies(offset)
  setCompanies([...companies, ...result.companies])
  setOffset(offset + result.companies.length)
  setHasMore(result.hasMore)
}
```

### 3. 검색 기능

```typescript
import { debounce } from 'lodash'

function CompanySearch() {
  const [searchTerm, setSearchTerm] = useState('')
  const [results, setResults] = useState([])

  // Debounce 적용으로 과도한 API 호출 방지
  const debouncedSearch = debounce(async (term: string) => {
    if (!term) {
      setResults([])
      return
    }

    const response = await fetch(
      `/api/admin/companies?search=${encodeURIComponent(term)}&limit=20`
    )
    const data = await response.json()
    setResults(data.companies)
  }, 300)

  const handleSearch = (value: string) => {
    setSearchTerm(value)
    debouncedSearch(value)
  }

  return (
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => handleSearch(e.target.value)}
      placeholder="Search companies..."
    />
  )
}
```

---

## 📚 추가 리소스

- **RBAC 시스템**: [phase1-3-usage.md](./phase1-3-usage.md)
- **감사 로그**: [phase1-2-usage.md](./phase1-2-usage.md)
- **설계 문서**: [phase1-4-design.md](./phase1-4-design.md)
- **전체 구현**: [implementation-progress.md](./implementation-progress.md)
