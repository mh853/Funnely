# Phase 1.2: 감사 로그 시스템 사용 가이드

## 📋 개요

Phase 1.2에서 구현된 감사 로그 시스템의 사용 방법을 안내합니다.

---

## 🎯 주요 기능

1. **자동 로깅**: 모든 중요한 관리자 작업 자동 기록
2. **로그 조회**: 필터링 및 검색 기능
3. **로그 통계**: 작업별, 사용자별, 시간별 통계
4. **CSV 내보내기**: 감사 보고서 생성

---

## 🖥️ UI 사용 방법

### 1. 감사 로그 페이지 접근

Admin 네비게이션에서 **"감사 로그"** 메뉴 클릭:
- URL: `/admin/audit-logs`
- 아이콘: Shield (방패)

### 2. 로그 필터링

**사용 가능한 필터**:
- **검색**: IP 주소 또는 User Agent로 검색
- **작업 타입**: 특정 작업(회사 생성, 사용자 수정 등)
- **시작 날짜**: 조회 시작 날짜
- **종료 날짜**: 조회 종료 날짜

**필터 적용**:
1. 원하는 필터 입력
2. "필터 적용" 버튼 클릭
3. 결과 확인

### 3. 로그 상세 보기

**방법**:
- 테이블의 행 클릭 또는
- "상세보기" 버튼 클릭

**표시 정보**:
- 날짜/시간
- 사용자 정보 (이름, 이메일)
- 회사 정보
- 작업 타입
- 대상 엔티티 (타입, ID)
- IP 주소
- User Agent
- 메타데이터 (JSON 형식)

### 4. CSV 내보내기

1. 필터를 원하는 대로 설정
2. "CSV 내보내기" 버튼 클릭
3. 파일 자동 다운로드: `audit-logs-YYYY-MM-DD.csv`

---

## 💻 프로그래밍 방식 사용

### 1. 감사 로그 미들웨어 사용

```typescript
import { createAuditLog, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

// API 라우트에서 감사 로그 생성
export async function POST(request: NextRequest) {
  const adminUser = await getSuperAdminUser()

  // ... 비즈니스 로직 ...

  // 감사 로그 생성
  await createAuditLog(request, {
    userId: adminUser.user.id,
    companyId: companyId,
    action: AUDIT_ACTIONS.COMPANY_CREATE,
    entityType: 'company',
    entityId: newCompany.id,
    metadata: {
      companyName: newCompany.name,
      createdBy: adminUser.profile.full_name,
    },
  })

  return NextResponse.json({ success: true })
}
```

### 2. 헬퍼 함수 사용

```typescript
import { auditLogHelpers, AUDIT_ACTIONS } from '@/lib/admin/audit-middleware'

// 회사 작업 로깅
await auditLogHelpers.logCompanyAction(
  request,
  AUDIT_ACTIONS.COMPANY_UPDATE,
  companyId,
  adminUserId,
  { changes: updatedFields }
)

// 사용자 작업 로깅
await auditLogHelpers.logUserAction(
  request,
  AUDIT_ACTIONS.USER_DELETE,
  targetUserId,
  adminUserId,
  companyId,
  { reason: 'Account closure requested' }
)

// 데이터 내보내기 로깅
await auditLogHelpers.logDataExport(
  request,
  AUDIT_ACTIONS.LEAD_EXPORT,
  adminUserId,
  companyId,
  { recordCount: 150, format: 'CSV' }
)
```

### 3. API 엔드포인트 사용

#### 로그 조회

```typescript
// GET /api/admin/audit-logs
const response = await fetch('/api/admin/audit-logs?limit=50&offset=0')
const data = await response.json()

console.log(data.logs) // 로그 배열
console.log(data.pagination) // 페이지네이션 정보
```

**쿼리 파라미터**:
- `limit`: 페이지 크기 (기본: 50, 최대: 100)
- `offset`: 페이지 오프셋 (기본: 0)
- `userId`: 특정 사용자 필터
- `companyId`: 특정 회사 필터
- `action`: 특정 작업 필터
- `entityType`: 엔티티 타입 필터
- `startDate`: 시작 날짜 (ISO 8601)
- `endDate`: 종료 날짜 (ISO 8601)
- `search`: IP 또는 User Agent 검색

#### 로그 수동 생성

```typescript
// POST /api/admin/audit-logs
const response = await fetch('/api/admin/audit-logs', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'custom.action',
    entityType: 'custom_entity',
    entityId: 'entity-123',
    metadata: { key: 'value' },
  }),
})
```

#### 통계 조회

```typescript
// GET /api/admin/audit-logs/stats
const response = await fetch('/api/admin/audit-logs/stats?days=30')
const data = await response.json()

console.log(data.stats.totalLogs) // 총 로그 수
console.log(data.stats.actionBreakdown) // 작업별 분류
console.log(data.stats.userBreakdown) // 사용자별 활동
console.log(data.stats.dailyActivity) // 일별 활동
console.log(data.stats.hourlyActivity) // 시간대별 활동
console.log(data.stats.categoryBreakdown) // 카테고리별 분류
```

---

## 📊 작업 타입 목록

### 회사 관리
- `company.create` - 회사 생성
- `company.update` - 회사 수정
- `company.delete` - 회사 삭제
- `company.activate` - 회사 활성화
- `company.deactivate` - 회사 비활성화

### 사용자 관리
- `user.create` - 사용자 생성
- `user.update` - 사용자 수정
- `user.delete` - 사용자 삭제
- `user.role_change` - 역할 변경
- `user.password_reset` - 비밀번호 재설정

### 리드 관리
- `lead.create` - 리드 생성
- `lead.update` - 리드 수정
- `lead.delete` - 리드 삭제
- `lead.status_change` - 상태 변경
- `lead.bulk_update` - 일괄 업데이트
- `lead.export` - 리드 내보내기

### 구독 관리
- `subscription.create` - 구독 생성
- `subscription.update` - 구독 업데이트
- `subscription.cancel` - 구독 취소

### 설정 변경
- `settings.update` - 설정 업데이트
- `settings.privacy_update` - 개인정보 설정 업데이트
- `settings.notification_update` - 알림 설정 업데이트

### 데이터 내보내기
- `data.export` - 데이터 내보내기
- `data.export_users` - 사용자 내보내기
- `data.export_leads` - 리드 내보내기
- `data.export_companies` - 회사 내보내기

### 관리자 인증
- `admin.login` - 관리자 로그인
- `admin.logout` - 관리자 로그아웃
- `admin.login_failed` - 로그인 실패

---

## 🔒 보안 고려사항

### 민감 정보 처리

**절대 로그에 포함하지 말아야 할 정보**:
- 비밀번호 (암호화되었더라도)
- 신용카드 정보
- 주민등록번호
- 개인 인증 토큰

**메타데이터에 포함 가능한 정보**:
- 변경 전/후 상태 (민감 정보 제외)
- 작업 이유
- 영향받은 레코드 수
- 에러 메시지 (스택 트레이스 제외)

### 예시

```typescript
// ❌ 나쁜 예
await createAuditLog(request, {
  action: AUDIT_ACTIONS.USER_UPDATE,
  metadata: {
    password: updatedPassword, // 절대 안됨!
    creditCard: '1234-5678-9012-3456', // 절대 안됨!
  },
})

// ✅ 좋은 예
await createAuditLog(request, {
  action: AUDIT_ACTIONS.USER_UPDATE,
  metadata: {
    fieldsChanged: ['email', 'full_name'],
    previousEmail: 'old@example.com',
    newEmail: 'new@example.com',
  },
})
```

---

## 🎯 모범 사례

### 1. 일관성 있는 작업 명명

```typescript
// ✅ 좋은 예: AUDIT_ACTIONS 상수 사용
await createAuditLog(request, {
  action: AUDIT_ACTIONS.COMPANY_CREATE,
  ...
})

// ❌ 나쁜 예: 하드코딩된 문자열
await createAuditLog(request, {
  action: 'create_company', // 일관성 없음
  ...
})
```

### 2. 의미 있는 메타데이터

```typescript
// ✅ 좋은 예
await createAuditLog(request, {
  action: AUDIT_ACTIONS.LEAD_BULK_UPDATE,
  metadata: {
    totalRecords: 150,
    successCount: 145,
    failedCount: 5,
    operation: 'status_change',
    newStatus: 'contacted',
  },
})

// ❌ 나쁜 예
await createAuditLog(request, {
  action: AUDIT_ACTIONS.LEAD_BULK_UPDATE,
  metadata: {}, // 정보 없음
})
```

### 3. 에러 로깅

```typescript
try {
  // 위험한 작업
  await deleteCompany(companyId)

  await createAuditLog(request, {
    action: AUDIT_ACTIONS.COMPANY_DELETE,
    entityId: companyId,
    metadata: { success: true },
  })
} catch (error) {
  await createAuditLog(request, {
    action: AUDIT_ACTIONS.COMPANY_DELETE,
    entityId: companyId,
    metadata: {
      success: false,
      error: error.message, // 스택 트레이스 제외
    },
  })
  throw error
}
```

---

## 📈 성능 최적화

### 로그 조회 최적화

1. **인덱스 활용**: 필터 조건을 인덱스 컬럼에 맞춤
   - `user_id`, `company_id`, `action`, `created_at`

2. **페이지네이션**: 항상 `limit`과 `offset` 사용

3. **날짜 범위 제한**: 너무 넓은 날짜 범위는 피함

```typescript
// ✅ 좋은 예: 적절한 날짜 범위
const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
fetch(`/api/admin/audit-logs?startDate=${thirtyDaysAgo.toISOString()}&limit=50`)

// ❌ 나쁜 예: 모든 데이터 조회
fetch('/api/admin/audit-logs?limit=10000') // 성능 문제!
```

---

## 🔧 문제 해결

### 로그가 생성되지 않을 때

1. **환경 변수 확인**:
   ```bash
   echo $SUPABASE_SERVICE_ROLE_KEY
   ```

2. **콘솔 에러 확인**: 브라우저 개발자 도구 콘솔

3. **네트워크 탭 확인**: API 요청 상태 코드

### 로그 조회가 느릴 때

1. **필터 사용**: 날짜 범위, 사용자, 작업 타입 등
2. **페이지 크기 줄이기**: `limit=50` 대신 `limit=25`
3. **인덱스 확인**: 데이터베이스 쿼리 플랜 분석

---

## 📚 추가 리소스

- **설계 문서**: [phase1-2-design.md](./phase1-2-design.md)
- **구현 진행**: [implementation-progress.md](./implementation-progress.md)
- **전체 설계**: [admin-enhancement-design.md](./admin-enhancement-design.md)
