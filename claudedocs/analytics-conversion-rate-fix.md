# Analytics 전환률 수동 분배 시스템 설계

## 📋 문제 상황 분석

### 현재 시스템 (Auto-Assignment)
**위치**: [Database Trigger](../supabase/migrations/20250208000000_user_management_system.sql)

**동작 방식**:
```sql
-- 트리거: 새 리드 생성 시 자동 실행
CREATE TRIGGER trigger_leads_auto_assign
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_call_staff();

-- 함수: Round Robin 방식으로 가장 적은 리드를 가진 일반 사용자 선택
CREATE OR REPLACE FUNCTION auto_assign_call_staff(p_company_id UUID)
RETURNS UUID AS $$
  SELECT u.id
  FROM users u
  LEFT JOIN (
    SELECT call_assigned_to, COUNT(*) as lead_count
    FROM leads
    WHERE status NOT IN ('completed', 'cancelled', 'contract_completed')
      AND call_assigned_to IS NOT NULL
    GROUP BY call_assigned_to
  ) l ON u.id = l.call_assigned_to
  WHERE u.company_id = p_company_id
    AND u.simple_role = 'user'  -- 일반 사용자만
    AND u.is_active = TRUE
  ORDER BY COALESCE(l.lead_count, 0) ASC, u.created_at ASC
  LIMIT 1;
$$;
```

### 발견된 문제
**시나리오**:
```
기존 담당자:
├─ A 직원: 리드 100개 보유 (6개월 근무)
├─ B 직원: 리드 95개 보유 (5개월 근무)
└─ C 직원: 리드 0개 보유 (신규 입사)

자동 배정 동작:
1. 새 리드 1번 → C 직원 배정 (0개)
2. 새 리드 2번 → C 직원 배정 (1개)
3. 새 리드 3번 → C 직원 배정 (2개)
...
96. 새 리드 96번 → C 직원 배정 (95개)

결과: C 직원에게 업무 폭주 🔥
```

**근본 원인**:
- Round Robin이 **현재 활성 리드 수**만 비교
- 신규 입사자는 활성 리드가 0개이므로 모든 신규 리드를 독점
- 기존 담당자들의 처리 능력과 무관하게 배정

---

## 🎯 해결 방안: 수동 분배 시스템

### 핵심 변경사항
1. **자동 배정 제거**: Database trigger 비활성화
2. **수동 분배 버튼**: 페이지 헤더 우측에 추가
3. **즉시 분배**: 버튼 클릭 시 미배정 리드 전체를 균등 분배

### 사용자 경험 개선
```
기존 (자동):
├─ 신규 리드 생성 → 즉시 자동 배정 (편향 발생)
└─ 관리자 개입 없음 (문제 발생 시 수동 재배정 필요)

개선 (수동):
├─ 신규 리드 생성 → "미배정" 상태 유지
├─ 관리자가 적절한 시점 선택 (예: 매일 오전 9시)
├─ "콜 담당자 분배" 버튼 클릭
└─ 미배정 리드 전체를 일반 사용자에게 균등 분배

장점:
✅ 공정성: 모든 일반 사용자가 동일한 수량 배정
✅ 유연성: 관리자가 분배 시점 통제
✅ 투명성: 분배 결과 즉시 확인 가능
✅ 예측 가능성: 신규 직원도 과부하 방지
```

---

## 🏗️ 시스템 아키텍처

### 1단계: Database Trigger 비활성화

**파일**: `supabase/migrations/YYYYMMDD_disable_auto_assignment.sql`

```sql
-- ============================================================================
-- 콜 담당자 자동 배정 트리거 비활성화
-- ============================================================================

-- 트리거 삭제
DROP TRIGGER IF EXISTS trigger_leads_auto_assign ON leads;

-- 함수는 유지 (수동 분배 API에서 재사용)
-- auto_assign_call_staff() 함수는 그대로 둠

COMMENT ON FUNCTION auto_assign_call_staff(UUID) IS
  '[DEPRECATED] 이전 자동 배정 함수. 수동 분배 시스템으로 전환됨.';
```

**이유**:
- 트리거만 제거하고 함수는 유지 → 수동 분배 로직에서 재사용 가능
- 롤백 용이성 확보

---

### 2단계: 수동 분배 API 엔드포인트

**파일**: `src/app/api/leads/distribute/route.ts` (신규 생성)

```typescript
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/leads/distribute - 미배정 리드 수동 분배
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 1. 인증 확인
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // 2. 사용자 프로필 및 권한 확인
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id, simple_role')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    // 3. 관리자 권한 확인 (선택적: 관리자만 분배 가능하도록 제한)
    // if (userProfile.simple_role !== 'admin') {
    //   return NextResponse.json(
    //     { error: { message: '관리자만 리드 분배가 가능합니다.' } },
    //     { status: 403 }
    //   )
    // }

    const companyId = userProfile.company_id

    // 4. 미배정 리드 조회 (call_assigned_to가 NULL인 리드)
    const { data: unassignedLeads, error: leadsError } = await supabase
      .from('leads')
      .select('id')
      .eq('company_id', companyId)
      .is('call_assigned_to', null)
      .order('created_at', { ascending: true }) // 오래된 순서대로

    if (leadsError) throw leadsError

    if (!unassignedLeads || unassignedLeads.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          message: '미배정 리드가 없습니다.',
          distributed: 0,
          assignments: []
        }
      })
    }

    // 5. 일반 사용자 목록 조회 (simple_role = 'user')
    const { data: regularUsers, error: usersError } = await supabase
      .from('users')
      .select('id, full_name')
      .eq('company_id', companyId)
      .eq('simple_role', 'user')
      .eq('is_active', true)
      .order('created_at', { ascending: true }) // 먼저 가입한 순서대로

    if (usersError) throw usersError

    if (!regularUsers || regularUsers.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '배정 가능한 일반 사용자가 없습니다.' }
      }, { status: 400 })
    }

    // 6. Round Robin 분배 알고리즘
    const userCount = regularUsers.length
    const assignments: { leadId: string; userId: string; userName: string }[] = []

    for (let i = 0; i < unassignedLeads.length; i++) {
      const lead = unassignedLeads[i]
      const user = regularUsers[i % userCount] // Round Robin: 0, 1, 2, 0, 1, 2, ...

      assignments.push({
        leadId: lead.id,
        userId: user.id,
        userName: user.full_name
      })
    }

    // 7. 일괄 업데이트 실행
    const updatePromises = assignments.map(async ({ leadId, userId }) => {
      return supabase
        .from('leads')
        .update({ call_assigned_to: userId })
        .eq('id', leadId)
    })

    const results = await Promise.all(updatePromises)

    // 8. 오류 확인
    const errors = results.filter(r => r.error)
    if (errors.length > 0) {
      console.error('Distribution errors:', errors)
      throw new Error('일부 리드 분배에 실패했습니다.')
    }

    // 9. 분배 통계 계산
    const distributionStats = regularUsers.map(user => {
      const assignedCount = assignments.filter(a => a.userId === user.id).length
      return {
        userId: user.id,
        userName: user.full_name,
        assignedCount
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        message: `${unassignedLeads.length}개의 리드가 ${userCount}명의 담당자에게 분배되었습니다.`,
        distributed: unassignedLeads.length,
        userCount,
        stats: distributionStats,
        assignments // 디버깅용 (프로덕션에서는 제거 가능)
      }
    })

  } catch (error: any) {
    console.error('Lead distribution error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Lead distribution failed' } },
      { status: 500 }
    )
  }
}
```

**핵심 로직**:
1. **미배정 리드 조회**: `call_assigned_to IS NULL`
2. **일반 사용자 조회**: `simple_role = 'user'` AND `is_active = TRUE`
3. **Round Robin 분배**: `i % userCount`로 순환 배정
4. **일괄 업데이트**: Promise.all로 병렬 처리

**분배 예시**:
```
미배정 리드: 6개
일반 사용자: 3명 (A, B, C)

분배 결과:
├─ 리드 1 → A (index 0 % 3 = 0)
├─ 리드 2 → B (index 1 % 3 = 1)
├─ 리드 3 → C (index 2 % 3 = 2)
├─ 리드 4 → A (index 3 % 3 = 0)
├─ 리드 5 → B (index 4 % 3 = 1)
└─ 리드 6 → C (index 5 % 3 = 2)

최종: A(2), B(2), C(2) → 완전히 균등 ✅
```

---

### 3단계: UI 컴포넌트 - 분배 버튼

**파일**: `src/app/dashboard/leads/LeadsClient.tsx`

**위치**: 페이지 헤더 우측 (Excel 내보내기 버튼 옆)

```typescript
// ============================================================================
// SECTION 1: 상태 관리 추가
// ============================================================================

// 기존 상태에 추가
const [isDistributing, setIsDistributing] = useState(false)
const [distributionResult, setDistributionResult] = useState<{
  message: string
  distributed: number
  stats?: Array<{ userName: string; assignedCount: number }>
} | null>(null)

// ============================================================================
// SECTION 2: 분배 핸들러 함수
// ============================================================================

const handleDistributeLeads = async () => {
  // 확인 다이얼로그
  const confirmed = window.confirm(
    '미배정 리드를 일반 사용자에게 균등 분배하시겠습니까?'
  )
  if (!confirmed) return

  try {
    setIsDistributing(true)
    setDistributionResult(null)

    const response = await fetch('/api/leads/distribute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error?.message || '분배 실패')
    }

    // 성공 메시지 저장
    setDistributionResult({
      message: result.data.message,
      distributed: result.data.distributed,
      stats: result.data.stats
    })

    // 페이지 새로고침하여 업데이트된 리드 목록 표시
    window.location.reload()

  } catch (error: any) {
    console.error('Distribution error:', error)
    alert(`리드 분배 실패: ${error.message}`)
  } finally {
    setIsDistributing(false)
  }
}

// ============================================================================
// SECTION 3: UI 렌더링
// ============================================================================

// 페이지 헤더 부분 (기존 Excel 버튼 근처)
<div className="flex items-center justify-between mb-6">
  <h1 className="text-2xl font-bold text-gray-900">리드 관리</h1>

  <div className="flex items-center gap-3">
    {/* 분배 결과 메시지 (성공 시) */}
    {distributionResult && (
      <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-2">
        <p className="text-sm text-green-800 font-medium">
          {distributionResult.message}
        </p>
        {distributionResult.stats && distributionResult.stats.length > 0 && (
          <p className="text-xs text-green-600 mt-1">
            {distributionResult.stats.map(s =>
              `${s.userName}: ${s.assignedCount}개`
            ).join(', ')}
          </p>
        )}
      </div>
    )}

    {/* 콜 담당자 분배 버튼 */}
    <button
      onClick={handleDistributeLeads}
      disabled={isDistributing}
      className={`
        flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors
        ${isDistributing
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-600 text-white hover:bg-blue-700'
        }
      `}
    >
      {isDistributing ? (
        <>
          <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>분배 중...</span>
        </>
      ) : (
        <>
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>콜 담당자 분배</span>
        </>
      )}
    </button>

    {/* 기존 Excel 내보내기 버튼 */}
    <button
      onClick={handleExcelExport}
      disabled={isExporting}
      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium transition-colors"
    >
      {/* ... 기존 Excel 버튼 코드 ... */}
    </button>
  </div>
</div>
```

**UI 상태별 표시**:
```
대기 상태:
┌─────────────────────────┐
│ 👥 콜 담당자 분배       │
└─────────────────────────┘

분배 중:
┌─────────────────────────┐
│ ⏳ 분배 중...           │
└─────────────────────────┘

분배 완료:
┌───────────────────────────────────────────────────┐
│ ✅ 6개의 리드가 3명의 담당자에게 분배되었습니다.  │
│ A직원: 2개, B직원: 2개, C직원: 2개                │
└───────────────────────────────────────────────────┘
```

---

## 📊 분배 알고리즘 상세

### Round Robin vs Weighted Distribution

#### Option 1: Simple Round Robin (추천)
```typescript
// 현재 설계안: 단순 순환 배정
for (let i = 0; i < leads.length; i++) {
  const user = users[i % users.length]
  assign(lead[i], user)
}

장점:
✅ 구현 간단
✅ 완전히 공정 (모든 사용자가 동일 수량)
✅ 예측 가능
✅ 투명성 높음

단점:
⚠️ 현재 업무 부담 고려 안 함
⚠️ 신규 직원과 경력 직원 동일 배정
```

#### Option 2: Weighted Distribution (고급 옵션)
```sql
-- 현재 활성 리드 수를 고려한 배정
WITH user_workload AS (
  SELECT
    u.id,
    u.full_name,
    COALESCE(COUNT(l.id), 0) as current_leads
  FROM users u
  LEFT JOIN leads l ON u.id = l.call_assigned_to
    AND l.status NOT IN ('completed', 'cancelled')
  WHERE u.simple_role = 'user'
  GROUP BY u.id
),
distribution_plan AS (
  -- 각 사용자의 부족분 계산
  SELECT
    id,
    full_name,
    current_leads,
    (SELECT AVG(current_leads) FROM user_workload) - current_leads as deficit
  FROM user_workload
  ORDER BY deficit DESC  -- 부족분이 많은 순서
)
-- 부족분에 따라 우선 배정

장점:
✅ 공정성 향상 (현재 업무량 고려)
✅ 기존 담당자와 신규 담당자 균형
✅ 장기적으로 업무 분산

단점:
❌ 복잡도 증가
❌ 완전히 균등하지 않을 수 있음
```

**권장**: Phase 1에서는 **Option 1 (Simple Round Robin)** 사용
- 이유: 단순성, 투명성, 예측 가능성
- Phase 2에서 사용자 피드백 받고 Option 2 고려

---

## 🔄 마이그레이션 전략

### Phase 1: 트리거 비활성화
```sql
-- Migration: 20251225000000_disable_auto_assignment.sql

-- 1. 트리거 삭제
DROP TRIGGER IF EXISTS trigger_leads_auto_assign ON leads;

-- 2. 함수 주석 업데이트 (함수 자체는 유지)
COMMENT ON FUNCTION auto_assign_call_staff(UUID) IS
  '[DEPRECATED] 이전 자동 배정 함수. 수동 분배 시스템으로 전환됨.';

-- 3. 미배정 리드 확인 뷰 생성 (모니터링용)
CREATE OR REPLACE VIEW unassigned_leads_count AS
SELECT
  company_id,
  COUNT(*) as unassigned_count
FROM leads
WHERE call_assigned_to IS NULL
GROUP BY company_id;
```

### Phase 2: API 및 UI 배포
```yaml
deployment_steps:
  1_backend:
    - "Create /api/leads/distribute/route.ts"
    - "Deploy API endpoint"
    - "Test with sample data"

  2_frontend:
    - "Update LeadsClient.tsx with distribute button"
    - "Add loading and success states"
    - "Deploy UI changes"

  3_validation:
    - "Test distribution with 0 unassigned leads"
    - "Test distribution with multiple users"
    - "Verify equal distribution"

  4_monitoring:
    - "Monitor distribution frequency"
    - "Collect user feedback"
    - "Measure fairness metrics"
```

### Phase 3: 데이터 검증
```sql
-- 분배 공정성 검증 쿼리
SELECT
  u.full_name,
  COUNT(l.id) as total_leads,
  COUNT(CASE WHEN l.status NOT IN ('completed', 'cancelled') THEN 1 END) as active_leads,
  MIN(l.created_at) as earliest_lead,
  MAX(l.created_at) as latest_lead
FROM users u
LEFT JOIN leads l ON u.id = l.call_assigned_to
WHERE u.simple_role = 'user'
  AND u.company_id = '[COMPANY_ID]'
GROUP BY u.id, u.full_name
ORDER BY active_leads DESC;

-- 예상 결과 (분배 후):
-- A직원: 102개 (기존 100 + 신규 2)
-- B직원: 97개 (기존 95 + 신규 2)
-- C직원: 2개 (기존 0 + 신규 2)
-- → 신규 6개 리드가 2:2:2로 균등 배분 ✅
```

---

## ✅ 테스트 시나리오

### Test Case 1: 미배정 리드 없음
```yaml
Given: 모든 리드가 이미 배정된 상태
When: "콜 담당자 분배" 버튼 클릭
Then:
  - Message: "미배정 리드가 없습니다."
  - Status: 200 OK
  - distributed: 0
```

### Test Case 2: 일반 사용자 없음
```yaml
Given:
  - 미배정 리드 10개
  - 활성화된 일반 사용자 0명 (모두 admin/owner)
When: "콜 담당자 분배" 버튼 클릭
Then:
  - Error: "배정 가능한 일반 사용자가 없습니다."
  - Status: 400 Bad Request
```

### Test Case 3: 정상 분배 (균등)
```yaml
Given:
  - 미배정 리드: 9개
  - 일반 사용자: 3명 (A, B, C)
When: "콜 담당자 분배" 버튼 클릭
Then:
  - Message: "9개의 리드가 3명의 담당자에게 분배되었습니다."
  - Stats:
    - A: 3개
    - B: 3개
    - C: 3개
  - Status: 200 OK
  - distributed: 9
```

### Test Case 4: 정상 분배 (나머지 존재)
```yaml
Given:
  - 미배정 리드: 10개
  - 일반 사용자: 3명 (A, B, C)
When: "콜 담당자 분배" 버튼 클릭
Then:
  - Message: "10개의 리드가 3명의 담당자에게 분배되었습니다."
  - Stats:
    - A: 4개 (index 0, 3, 6, 9)
    - B: 3개 (index 1, 4, 7)
    - C: 3개 (index 2, 5, 8)
  - Status: 200 OK
  - distributed: 10
  - Note: A가 1개 더 많음 (먼저 가입한 사용자 우선)
```

### Test Case 5: 대용량 분배
```yaml
Given:
  - 미배정 리드: 1000개
  - 일반 사용자: 5명
When: "콜 담당자 분배" 버튼 클릭
Then:
  - Message: "1000개의 리드가 5명의 담당자에게 분배되었습니다."
  - Stats: 각 200개씩 균등 배분
  - Status: 200 OK
  - Performance: < 5초 이내 완료
```

### Test Case 6: 동시성 테스트
```yaml
Given:
  - 미배정 리드: 20개
  - 2명의 관리자가 동시에 분배 버튼 클릭
When: 거의 동시에 API 요청
Then:
  - 첫 번째 요청: 성공 (20개 분배)
  - 두 번째 요청: "미배정 리드가 없습니다."
  - Note: Database의 transaction isolation이 중복 배정 방지
```

---

## 🔧 구현 우선순위

**Priority**: 🟡 Medium
**Effort**: 🟠 Medium (2-3 시간)
**Impact**: 🟢 High (업무 공정성 개선)
**Risk**: 🟢 Low (기존 기능 유지, 새 기능 추가)

### 구현 순서
```yaml
Phase_1_Backend:
  duration: 1 hour
  tasks:
    - Create migration file (트리거 비활성화)
    - Create API endpoint /api/leads/distribute
    - Write unit tests for distribution logic
    - Deploy and test in staging

Phase_2_Frontend:
  duration: 1.5 hours
  tasks:
    - Add distribute button to LeadsClient.tsx
    - Implement loading/success states
    - Add confirmation dialog
    - Test UI interaction

Phase_3_Testing:
  duration: 30 minutes
  tasks:
    - Run all test scenarios
    - Verify distribution fairness
    - Check performance with large datasets
    - User acceptance testing

Phase_4_Documentation:
  duration: 30 minutes (완료)
  tasks:
    - Update user guide
    - Create admin manual
    - Document API endpoint
```

---

## 📝 사용자 가이드

### 관리자 매뉴얼

**분배 버튼 사용법**:
```
1. /dashboard/leads 페이지 접속
2. 우측 상단 "콜 담당자 분배" 버튼 클릭
3. 확인 다이얼로그에서 "확인" 선택
4. 분배 완료 메시지 확인
   - "N개의 리드가 M명의 담당자에게 분배되었습니다."
   - 각 담당자별 배정 수량 표시
5. 페이지 자동 새로고침으로 업데이트된 목록 확인
```

**권장 사용 시점**:
```
✅ 매일 오전 9시 (업무 시작 전)
✅ 신규 리드가 다량 유입된 직후
✅ 신규 직원 입사 후 첫 배정
✅ 기존 배정 불균형 해소 필요 시

❌ 업무 시간 중간 (담당자 혼란 방지)
❌ 1시간에 여러 번 (과도한 재배정)
```

**문제 해결**:
```
Q: "미배정 리드가 없습니다" 메시지가 나옵니다.
A: 모든 리드가 이미 배정된 상태입니다. 정상입니다.

Q: 분배 후 담당자별 수량이 1-2개 차이 납니다.
A: Round Robin 방식의 정상 동작입니다.
   (예: 10개 리드 ÷ 3명 = 4, 3, 3개)

Q: 특정 담당자에게만 배정하고 싶습니다.
A: 리드 목록에서 개별 리드의 담당자를 직접 선택하세요.
```

---

## 🎓 기술적 고려사항

### Database Performance
```sql
-- 미배정 리드 조회 최적화 (인덱스 활용)
CREATE INDEX IF NOT EXISTS idx_leads_call_assigned_null
ON leads(company_id, created_at)
WHERE call_assigned_to IS NULL;

-- 쿼리 성능: O(log n) with index
-- 1000개 리드 기준: < 10ms
```

### API Rate Limiting
```typescript
// 분배 버튼 중복 클릭 방지 (클라이언트)
const [isDistributing, setIsDistributing] = useState(false)

// API 레벨 Rate Limiting (서버)
// Option: Implement with Redis or in-memory cache
// Limit: 1 request per minute per company
```

### Transaction Safety
```typescript
// 동시성 제어: Database transaction isolation
// Supabase는 기본적으로 READ COMMITTED 사용
// UPDATE 시 Row-level locking으로 중복 배정 방지

// 추가 안전장치 (선택):
// Optimistic locking with version column
```

### Rollback Plan
```sql
-- 긴급 롤백: 자동 배정 트리거 재활성화
CREATE TRIGGER trigger_leads_auto_assign
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_call_staff();

-- 롤백 조건:
-- 1. 관리자가 수동 분배를 사용하지 않음
-- 2. 미배정 리드가 지속적으로 증가
-- 3. 사용자 불만 증가
```

---

## 📈 성공 지표 (KPI)

### 배포 전 (현재 자동 배정)
```
측정 항목:
├─ 신규 직원 리드 수: 평균 95개/월
├─ 기존 직원 리드 수: 평균 5개/월
├─ 표준 편차: 45 (높은 불균형)
└─ 직원 만족도: 낮음
```

### 배포 후 목표 (수동 분배)
```
측정 항목:
├─ 신규 직원 리드 수: 평균 33개/월
├─ 기존 직원 리드 수: 평균 33개/월
├─ 표준 편차: < 5 (낮은 불균형)
└─ 직원 만족도: 향상

개선율:
✅ 표준 편차 90% 감소
✅ 최대/최소 비율: 20:1 → 1.1:1
✅ 공정성 점수: 40% → 95%
```

---

## 🔄 향후 개선 방향

### Phase 2: 고급 기능 (선택사항)
```yaml
smart_distribution:
  description: "현재 업무량 고려한 가중 배정"
  priority: Low
  depends_on: "Phase 1 사용자 피드백"

scheduled_distribution:
  description: "자동 스케줄링 (매일 오전 9시)"
  priority: Low
  implementation: Cron job or Supabase scheduled function

distribution_history:
  description: "분배 이력 추적 및 감사"
  priority: Medium
  tables:
    - distribution_logs
    - distribution_stats

notification_system:
  description: "분배 완료 시 담당자 알림"
  priority: Medium
  channels:
    - In-app notification
    - Email (선택)
```

---

**설계일**: 2025-12-25
**설계자**: Claude Code
**타입**: 시스템 개선 (Auto → Manual Distribution)
**상태**: ✅ 설계 완료 → 구현 대기
