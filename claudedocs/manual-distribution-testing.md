# 콜 담당자 수동 분배 시스템 - 테스트 가이드

## 📋 구현 완료 요약

### ✅ 완료된 작업
1. **Database Migration** ([20251225000000_disable_auto_assignment.sql](../supabase/migrations/20251225000000_disable_auto_assignment.sql))
   - 자동 배정 트리거 비활성화
   - 성능 최적화 인덱스 추가
   - 모니터링 뷰 생성

2. **API Endpoint** ([/api/leads/distribute/route.ts](../src/app/api/leads/distribute/route.ts))
   - Round Robin 분배 알고리즘 구현
   - 동시성 제어 로직 추가
   - 분배 통계 반환

3. **UI Implementation** ([LeadsClient.tsx](../src/app/dashboard/leads/LeadsClient.tsx))
   - 페이지 헤더에 "콜 담당자 분배" 버튼 추가
   - 로딩 상태 및 성공 메시지 표시
   - 자동 페이지 새로고침

## 🎯 테스트 계획

### Phase 1: Migration 실행 및 검증

#### 1.1 Migration 실행
```bash
# Supabase CLI로 migration 실행
cd /Users/mh.c/medisync
supabase db push

# 또는 Supabase Dashboard에서 SQL 직접 실행
# URL: https://supabase.com/dashboard/project/YOUR_PROJECT_ID/sql
```

#### 1.2 Database 변경사항 검증
```sql
-- 1. 트리거가 제거되었는지 확인
SELECT
  tgname as trigger_name,
  tgenabled as enabled
FROM pg_trigger
WHERE tgname = 'trigger_leads_auto_assign';
-- 예상 결과: 행이 없거나 tgenabled = 'D' (disabled)

-- 2. 함수가 여전히 존재하는지 확인
SELECT
  proname as function_name,
  obj_description(oid) as description
FROM pg_proc
WHERE proname = 'auto_assign_call_staff';
-- 예상 결과: 1개 행, description에 '[DEPRECATED]' 포함

-- 3. 새로운 인덱스 확인
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE indexname = 'idx_leads_call_assigned_null';
-- 예상 결과: 1개 행, WHERE call_assigned_to IS NULL 조건 포함

-- 4. 모니터링 뷰 확인
SELECT
  company_id,
  unassigned_count,
  oldest_lead,
  newest_lead
FROM unassigned_leads_stats
LIMIT 5;
-- 예상 결과: 회사별 미배정 리드 통계
```

### Phase 2: API Endpoint 테스트

#### 2.1 미배정 리드 없는 경우
```bash
# 테스트 시나리오: 모든 리드가 이미 배정된 상태
curl -X POST http://localhost:3000/api/leads/distribute \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE"

# 예상 응답:
# {
#   "success": true,
#   "data": {
#     "message": "미배정 리드가 없습니다.",
#     "distributed": 0,
#     "userCount": 0,
#     "stats": []
#   }
# }
```

#### 2.2 정상 분배 테스트
```sql
-- 1. 테스트용 미배정 리드 생성 (6개)
UPDATE leads
SET call_assigned_to = NULL
WHERE id IN (
  SELECT id FROM leads
  WHERE company_id = 'YOUR_COMPANY_ID'
  ORDER BY created_at DESC
  LIMIT 6
);

-- 2. 일반 사용자 수 확인
SELECT
  id,
  full_name,
  simple_role
FROM users
WHERE company_id = 'YOUR_COMPANY_ID'
  AND simple_role = 'user'
  AND is_active = true
ORDER BY created_at ASC;
-- 예상: 3명의 사용자 (User A, User B, User C)
```

```bash
# API 호출
curl -X POST http://localhost:3000/api/leads/distribute \
  -H "Content-Type: application/json" \
  -H "Cookie: YOUR_AUTH_COOKIE"

# 예상 응답:
# {
#   "success": true,
#   "data": {
#     "message": "6개의 리드가 3명의 담당자에게 분배되었습니다.",
#     "distributed": 6,
#     "userCount": 3,
#     "stats": [
#       { "userId": "...", "userName": "User A", "assignedCount": 2 },
#       { "userId": "...", "userName": "User B", "assignedCount": 2 },
#       { "userId": "...", "userName": "User C", "assignedCount": 2 }
#     ]
#   }
# }
```

```sql
-- 3. 분배 결과 검증
SELECT
  u.full_name,
  COUNT(*) as assigned_leads
FROM leads l
JOIN users u ON l.call_assigned_to = u.id
WHERE l.company_id = 'YOUR_COMPANY_ID'
  AND l.id IN (/* 위에서 NULL로 설정한 6개 리드 ID */)
GROUP BY u.id, u.full_name
ORDER BY u.created_at ASC;
-- 예상: User A: 2, User B: 2, User C: 2
```

#### 2.3 Round Robin 검증 (홀수 개 리드)
```sql
-- 5개 리드로 테스트 (3명 사용자)
UPDATE leads
SET call_assigned_to = NULL
WHERE id IN (
  SELECT id FROM leads
  WHERE company_id = 'YOUR_COMPANY_ID'
  ORDER BY created_at DESC
  LIMIT 5
);
```

```bash
# API 호출 후 예상 결과:
# User A: 2개 (index 0, 3)
# User B: 2개 (index 1, 4)
# User C: 1개 (index 2)
```

#### 2.4 동시성 제어 테스트
```bash
# 두 개의 터미널에서 동시에 실행
# Terminal 1:
curl -X POST http://localhost:3000/api/leads/distribute

# Terminal 2: (즉시 실행)
curl -X POST http://localhost:3000/api/leads/distribute

# 예상 결과:
# - 첫 번째: 성공 (N개 리드 분배)
# - 두 번째: 성공 (0개 리드 - 이미 배정됨)
# - 중복 배정 없음
```

### Phase 3: UI 기능 테스트

#### 3.1 버튼 표시 확인
1. `/dashboard/leads` 페이지 접속
2. 페이지 헤더 우측에 "콜 담당자 분배" 버튼 확인
3. 버튼 위치: "DB 수동 추가" 및 "엑셀 내보내기" 버튼 왼쪽

**예상 UI:**
```
[성공 메시지 영역]  [👥 콜 담당자 분배]  [DB 수동 추가]  [📥 엑셀 내보내기]
```

#### 3.2 분배 실행 테스트
1. "콜 담당자 분배" 버튼 클릭
2. 확인 대화상자 표시: "미배정 리드를 일반 사용자에게 균등 분배하시겠습니까?"
3. "확인" 클릭
4. 버튼 비활성화 및 "분배 중..." 표시 (스피너 아이콘)
5. 2초 후 성공 메시지 표시:
   ```
   ✅ 6개의 리드가 3명의 담당자에게 분배되었습니다.
   User A: 2개, User B: 2개, User C: 2개
   ```
6. 2초 후 자동 페이지 새로고침
7. 리드 목록에서 담당자 컬럼 업데이트 확인

#### 3.3 에러 처리 테스트
```bash
# 시나리오 1: 일반 사용자가 없는 경우
# - 예상: Alert "리드 분배 실패: 배정 가능한 일반 사용자가 없습니다."

# 시나리오 2: 미배정 리드가 없는 경우
# - 예상: 성공 메시지 "미배정 리드가 없습니다."

# 시나리오 3: 네트워크 오류
# - 예상: Alert "리드 분배 실패: [에러 메시지]"
```

### Phase 4: 기존 시스템 영향 확인 (Regression Testing)

#### 4.1 리드 생성 테스트
```bash
# 1. 랜딩페이지에서 신규 리드 제출
# 예상: 리드 생성 성공, call_assigned_to = NULL (자동 배정 안됨)

# 2. DB 확인
SELECT
  id,
  name,
  call_assigned_to,
  created_at
FROM leads
WHERE company_id = 'YOUR_COMPANY_ID'
ORDER BY created_at DESC
LIMIT 1;
-- 예상: call_assigned_to IS NULL
```

#### 4.2 수동 담당자 배정 테스트
1. 리드 상세 페이지에서 담당자 수동 배정
2. 예상: 정상 작동 (기존 기능 유지)

#### 4.3 엑셀 내보내기 테스트
1. "엑셀 내보내기" 버튼 클릭
2. 예상: 정상 작동 (기존 기능 유지)

#### 4.4 필터링 기능 테스트
1. 담당자 필터, 날짜 필터, 상태 필터 테스트
2. 예상: 모두 정상 작동

## 📊 테스트 시나리오 매트릭스

| # | 시나리오 | 미배정 리드 | 일반 사용자 | 예상 결과 | 상태 |
|---|---------|------------|-----------|---------|------|
| 1 | 정상 분배 (6개 리드, 3명 사용자) | 6 | 3 | 각 2개씩 분배 | ⏳ |
| 2 | 홀수 리드 (5개 리드, 3명 사용자) | 5 | 3 | 2, 2, 1개 분배 | ⏳ |
| 3 | 미배정 리드 없음 | 0 | 3 | "미배정 리드가 없습니다" | ⏳ |
| 4 | 일반 사용자 없음 | 6 | 0 | 에러: "배정 가능한 일반 사용자가 없습니다" | ⏳ |
| 5 | 동시 실행 | 6 | 3 | 중복 배정 없음 | ⏳ |
| 6 | 신규 리드 생성 | - | - | call_assigned_to NULL | ⏳ |
| 7 | 기존 기능 (필터, 엑셀) | - | - | 정상 작동 | ⏳ |

## 🔍 문제 발생 시 체크리스트

### Migration 관련
- [ ] Migration 파일 실행 완료 확인
- [ ] Trigger 비활성화 확인 (`SELECT * FROM pg_trigger WHERE tgname = 'trigger_leads_auto_assign'`)
- [ ] Index 생성 확인 (`SELECT * FROM pg_indexes WHERE indexname = 'idx_leads_call_assigned_null'`)

### API 관련
- [ ] API 엔드포인트 접근 가능 확인 (`/api/leads/distribute`)
- [ ] 인증 쿠키 유효성 확인
- [ ] Console에서 에러 로그 확인 (`console.error`)
- [ ] Network 탭에서 요청/응답 확인

### UI 관련
- [ ] React 컴포넌트 빌드 오류 확인 (`npm run build`)
- [ ] 브라우저 Console 오류 확인
- [ ] State 변수 초기화 확인
- [ ] 이벤트 핸들러 바인딩 확인

## 📝 롤백 절차 (긴급 시)

Migration 롤백이 필요한 경우:

```sql
-- 자동 배정 트리거 재활성화
CREATE TRIGGER trigger_leads_auto_assign
  BEFORE INSERT ON leads
  FOR EACH ROW
  EXECUTE FUNCTION trigger_auto_assign_call_staff();

-- 확인
SELECT tgname, tgenabled
FROM pg_trigger
WHERE tgname = 'trigger_leads_auto_assign';
-- 예상: tgenabled = 'O' (enabled)
```

## ✅ 테스트 완료 기준

- [ ] Migration 성공적으로 실행
- [ ] 자동 배정 트리거 비활성화 확인
- [ ] API 엔드포인트 모든 시나리오 통과
- [ ] UI 버튼 정상 작동 및 UX 검증
- [ ] Round Robin 알고리즘 정확성 검증
- [ ] 동시성 제어 정상 작동
- [ ] 기존 시스템 영향 없음 (Regression Test 통과)
- [ ] 성능 테스트 (100개 리드 분배 < 5초)

## 📈 성공 지표 (KPIs)

테스트 완료 후 다음 지표로 성공 여부 판단:

1. **기능 정확성**: Round Robin 분배 정확도 100%
2. **동시성 안전성**: 중복 배정 발생률 0%
3. **성능**: 100개 리드 분배 시간 < 5초
4. **안정성**: 기존 기능 Regression 0건
5. **사용성**: 분배 버튼 클릭 후 결과 확인까지 < 3초

## 🎓 참고 문서

- [설계 문서](./analytics-conversion-rate-fix.md)
- [Migration 파일](../supabase/migrations/20251225000000_disable_auto_assignment.sql)
- [API Route](../src/app/api/leads/distribute/route.ts)
- [UI Component](../src/app/dashboard/leads/LeadsClient.tsx)
