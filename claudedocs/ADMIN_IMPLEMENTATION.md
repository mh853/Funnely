# MediSync Admin System Implementation

슈퍼 어드민이 전체 회사와 사용자를 관리할 수 있는 시스템 구현 문서

## 개요

MediSync의 슈퍼 어드민 시스템은 다음과 같은 주요 기능을 제공합니다:
- 전체 회사 관리 (구독 상태, 활성화/비활성화)
- 전체 사용자 관리 (역할 변경, 활성화/비활성화, 비밀번호 재설정)
- 통계 및 활동 로그 추적

## 구현 단계

### Phase 1: 데이터베이스 기반 구조 (완료)
- ✅ 회사 활동 로그 테이블 생성
- ✅ 인덱스 최적화
- ✅ 슈퍼 어드민 권한 검증 함수

### Phase 2: Admin 대시보드 레이아웃 (완료)
- ✅ Admin 레이아웃 컴포넌트
- ✅ 사이드바 네비게이션
- ✅ 권한 검증 미들웨어

### Phase 3: 회사 관리 시스템 (완료)
- ✅ 회사 목록 페이지 (`/admin/companies`)
- ✅ 회사 상세 페이지 (`/admin/companies/[id]`)
- ✅ API 엔드포인트 5개
  - GET `/admin/api/companies` - 회사 목록
  - GET `/admin/api/companies/[id]` - 회사 상세
  - PATCH `/admin/api/companies/[id]` - 회사 상태 변경
  - GET `/admin/api/companies/[id]/users` - 회사 사용자 목록
  - GET `/admin/api/companies/[id]/activities` - 회사 활동 로그

### Phase 4: 사용자 관리 시스템 (완료)
- ✅ 사용자 목록 페이지 (`/admin/users`)
- ✅ 사용자 상세 페이지 (`/admin/users/[id]`)
- ✅ API 엔드포인트 5개
  - GET `/admin/api/users` - 사용자 목록
  - GET `/admin/api/users/[id]` - 사용자 상세
  - GET `/admin/api/users/[id]/activities` - 사용자 활동 로그
  - PATCH `/admin/api/users/[id]` - 사용자 정보 수정
  - POST `/admin/api/users/[id]/reset-password` - 비밀번호 재설정

## 파일 구조

```
src/
├── app/
│   └── admin/
│       ├── layout.tsx                              # Admin 레이아웃
│       ├── page.tsx                                # Admin 대시보드
│       ├── api/
│       │   ├── companies/
│       │   │   ├── route.ts                        # 회사 목록 API
│       │   │   └── [id]/
│       │   │       ├── route.ts                    # 회사 상세 API
│       │   │       ├── users/route.ts              # 회사 사용자 목록 API
│       │   │       └── activities/route.ts         # 회사 활동 로그 API
│       │   └── users/
│       │       ├── route.ts                        # 사용자 목록 API
│       │       └── [id]/
│       │           ├── route.ts                    # 사용자 상세/수정 API
│       │           ├── activities/route.ts         # 사용자 활동 로그 API
│       │           └── reset-password/route.ts     # 비밀번호 재설정 API
│       ├── companies/
│       │   ├── page.tsx                            # 회사 목록 페이지
│       │   └── [id]/
│       │       ├── page.tsx                        # 회사 상세 페이지
│       │       └── components/
│       │           ├── CompanyHeader.tsx
│       │           ├── OverviewTab.tsx
│       │           ├── UsersTab.tsx
│       │           └── ActivityTab.tsx
│       ├── users/
│       │   ├── page.tsx                            # 사용자 목록 페이지
│       │   └── [id]/
│       │       ├── page.tsx                        # 사용자 상세 페이지
│       │       └── components/
│       │           ├── UserHeader.tsx
│       │           ├── OverviewTab.tsx
│       │           ├── ActivityTab.tsx
│       │           └── SettingsTab.tsx
│       └── components/
│           └── Sidebar.tsx                         # Admin 사이드바
├── lib/
│   └── admin/
│       └── permissions.ts                          # 권한 검증 함수
└── types/
    └── admin.ts                                    # Admin 타입 정의

supabase/migrations/
├── 20251212000002_add_company_activity_logs.sql    # Phase 1
├── 20251213000005_add_companies_indexes.sql        # Phase 3
├── 20251213000006_add_is_active_to_companies.sql   # Phase 3
└── 20251213000007_add_users_indexes.sql            # Phase 4
```

## 주요 기능

### 회사 관리
1. **회사 목록** (`/admin/companies`)
   - 검색: 회사명, 담당자 이메일
   - 필터: 활성/비활성, 가입일 범위
   - 정렬: 가입일, 회사명
   - 페이지네이션: 20개씩
   - 통계: 총 회사 수

2. **회사 상세** (`/admin/companies/[id]`)
   - 개요 탭: 기본 정보, 통계
   - 사용자 탭: 소속 사용자 목록
   - 활동 탭: 회사 활동 로그
   - 활성화/비활성화 토글

### 사용자 관리
1. **사용자 목록** (`/admin/users`)
   - 검색: 이름, 이메일, 전화번호
   - 필터: 회사별, 역할별, 활성/비활성, 가입일 범위
   - 정렬: 가입일, 마지막 로그인, 이름
   - 페이지네이션: 20명씩
   - 통계: 총 사용자, 활성 사용자, 비활성 사용자

2. **사용자 상세** (`/admin/users/[id]`)
   - 개요 탭: 기본 정보, 통계, 권한 정보
   - 활동 탭: 사용자 활동 로그
   - 설정 탭: 역할 변경, 계정 상태
   - 빠른 액션:
     - 비밀번호 재설정 이메일 발송
     - 활성화/비활성화 토글
     - 역할 변경 (admin, manager, staff, viewer)

## 데이터베이스 최적화

### 인덱스 구성

**회사 관리 (Phase 3)**
```sql
idx_companies_created_at        -- 가입일 정렬
idx_companies_is_active         -- 활성 상태 필터
idx_companies_name_search       -- 회사명 검색 (GIN)
```

**사용자 관리 (Phase 4)**
```sql
idx_users_last_login            -- 마지막 로그인 정렬
idx_users_full_name             -- 이름 정렬
idx_users_email_search          -- 이메일 검색 (GIN)
idx_users_phone_search          -- 전화번호 검색 (GIN)
idx_users_company_role          -- 회사별 역할 필터
idx_users_company_active_role   -- 회사별 활성 역할 필터
idx_users_created_at            -- 생성일 정렬
idx_users_role_active           -- 역할별 활성 상태 필터
```

## 권한 시스템

### 슈퍼 어드민 권한 검증
```typescript
// src/lib/admin/permissions.ts
export async function requireSuperAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    throw new Error('Unauthorized')
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    throw new Error('Super admin access required')
  }
}
```

모든 Admin API는 이 함수를 통해 권한을 검증합니다.

### 역할별 권한

| 역할 | 권한 |
|------|------|
| admin | 사용자 관리, 리드 관리, 페이지 관리, 리포트 조회 |
| manager | 리드 관리, 페이지 관리, 리포트 조회 |
| staff | 리드 관리, 페이지 조회 |
| viewer | 리드 조회, 페이지 조회 |

## 활동 로그

모든 중요한 작업은 `company_activity_logs` 테이블에 기록됩니다:

- 회사 상태 변경
- 사용자 역할 변경
- 사용자 활성화/비활성화
- 비밀번호 재설정 이메일 발송

## 성능 고려사항

1. **인덱스 활용**: 모든 필터링/정렬 컬럼에 인덱스 적용
2. **GIN 인덱스**: 전체 텍스트 검색을 위한 GIN 인덱스 사용
3. **페이지네이션**: 대량 데이터 처리를 위한 페이지네이션 구현
4. **통계 최적화**: COUNT 쿼리 최적화 및 캐싱 고려

## 향후 개선 사항

### Phase 5: 대시보드 및 리포트 (예정)
- 전체 시스템 통계 대시보드
- 회사별 성과 리포트
- 사용자별 활동 분석
- 구독 관리 시스템

### Phase 6: 고급 기능 (예정)
- 사용자 일괄 작업 (벌크 업데이트)
- 고급 검색 및 필터
- 데이터 내보내기 (CSV, Excel)
- 시스템 알림 및 경고

## 보안 고려사항

1. **권한 검증**: 모든 API에서 슈퍼 어드민 권한 확인
2. **활동 추적**: 모든 중요 작업은 로그로 기록
3. **데이터 보호**: 민감한 정보(비밀번호 등)는 절대 노출하지 않음
4. **비밀번호 재설정**: Supabase Auth의 안전한 메커니즘 사용

## 구현 완료

- ✅ Phase 1: 데이터베이스 기반 구조
- ✅ Phase 2: Admin 대시보드 레이아웃
- ✅ Phase 3: 회사 관리 시스템
- ✅ Phase 4: 사용자 관리 시스템
- ⏳ Phase 5: 대시보드 및 리포트 (예정)
- ⏳ Phase 6: 고급 기능 (예정)
