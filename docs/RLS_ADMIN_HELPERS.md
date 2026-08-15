# RLS 관리자/소속 판정 헬퍼 함수 지도

작성일 2026-08-15. QA 루프에서 9회+ 반복 확인된 "RLS 권한검사 role 배열이 항상 불완전"
패턴(1번)을 구조적으로 닫기 위해 라이브 DB(`pg_dump -s public`)를 직접 조사해 작성했다.
매트릭스(`claudedocs/structural-fixes-priority-matrix.md`)의 원래 진단 "공용함수 없음
(0건)"은 **마이그레이션 파일을 grep한 결과였고, 라이브 스키마 기준으로는 틀렸다** - 이미
헬퍼 함수가 존재하고 일부 적용되어 있다. 이 문서는 그 정정된 현재 상태를 기록한다.

## 이미 존재하는 헬퍼 함수 5개 (라이브 확인, 2026-08-15)

전부 `SECURITY DEFINER` + `STABLE` + `SET search_path = public`로 정의되어 있고
`postgres`(테이블 소유자)가 소유한다. `users`를 포함한 모든 테이블에
`FORCE ROW LEVEL SECURITY`가 걸려있지 않음을 확인했다(`pg_dump`에 해당 구문 0건) -
그래서 이 함수들이 내부에서 `users`를 조회해도 소유자 권한으로 RLS를 우회해 재귀가
발생하지 않는다. **이 성질이 이 컨벤션 전체의 전제조건이다 - 나중에 누군가
`ALTER TABLE users FORCE ROW LEVEL SECURITY`를 걸면 아래 함수 전부가 동시에
재귀 오류를 내기 시작한다.** RLS 강화 작업을 할 때 이 문서를 반드시 먼저 볼 것.

| 함수 | 판정 내용 | 정의 위치(마이그레이션) |
|------|-----------|---------------------------|
| `get_my_company_id()` | 내 `company_id` | 20260711000000 계열 |
| `am_i_admin_or_legacy_owner()` | `simple_role='admin'` 또는 `role IN (company_owner/company_admin/hospital_owner/hospital_admin)` | 20260711000000 계열 |
| `am_i_super_admin()` | `users.is_super_admin` 플래그 | 20260711000000 계열 |
| `am_i_active_in_active_company()` | 나와 내 회사가 둘 다 `is_active`, 회사가 `withdrawn_at IS NULL` | 20260809000003(74차 QA, 재귀 재발 수정) |
| `is_super_admin_via_role_assignment()` | `admin_role_assignments`+`admin_roles` 조인, `code='super_admin'` | 20260726000001 |

`am_i_active_in_active_company()`의 20260809000003은 **직전 마이그레이션이 만든 재귀
버그를 하루 만에 실DB 라이브 검증으로 잡아 고친 기록**이다(74차 QA) - "정책이 걸린
테이블 자기 자신을 서브쿼리로 다시 읽으면 재귀"라는 규칙이 이 함수 자체에도 한 번
적용됐었다는 뜻. 새 헬퍼 함수를 `users` 위의 정책에 추가할 때마다 이 사고가 재발할 수
있는 지점이니, 반드시 SECURITY DEFINER로 만들 것.

## 실제 채택 현황 (라이브 정책 150개 전수 확인)

**정정: "구조적으로 닫혔다"고 단정할 수 없다 - 두 종류의 중복을 구분해야 한다.**

### 1) role 배열 리터럴 중복 - 사실상 해소됨

`('company_owner','company_admin','hospital_owner','hospital_admin')` 같은 role 값
자체를 정책 안에 다시 타이핑하는 경우는 **150개 정책 중 1건뿐**이고, 그 1건도 이미
`am_i_admin_or_legacy_owner()`를 함께 쓰고 있다. 원래 패턴1이 가리켰던 "role 배열이
버전마다 미묘하게 달라 드리프트"라는 좁은 의미의 문제는 이 5개 함수로 사실상 닫혔다.

### 2) 소속(company_id)/활성여부 확인의 인라인 서브쿼리 중복 - 여전히 광범위

정책 5개 함수의 실제 호출 횟수는 150개 정책 중 17회(중복 호출 포함)뿐인 반면,
**`FROM users`를 직접 서브쿼리로 여는 정책이 110개(73%)** 있다 - 헬퍼 함수를 안 쓰고
`company_id IN (SELECT company_id FROM users WHERE id = auth.uid() ...)` 형태를 매번
다시 쓰는 것이다. 이게 바로 이 세션에서 가장 큰 마이그레이션 두 건
(`20260807000002_enforce_is_active_across_company_scoped_rls.sql` 43KB,
`20260809000002_enforce_company_active_across_rls.sql` 58KB)이 그렇게 커진 이유다 -
"모든 회사소속 확인에 is_active 체크를 추가하라"는 요구 하나를 반영하려고 공용 함수
하나만 고치는 대신 110개에 가까운 정책을 개별적으로 찾아 고쳐야 했다. 앞으로 또 같은
종류의 전역 요구사항(예: 새 상태 컬럼 체크 추가)이 생기면 같은 규모의 마이그레이션이
또 필요하다 - **이 중복은 구조적으로 해소되지 않았다.**

## 부수 발견

### 슈퍼관리자 판정 소스가 2개다

`am_i_super_admin()`(`users.is_super_admin` 플래그)과
`is_super_admin_via_role_assignment()`(`admin_role_assignments` 테이블)가 서로 다른
출처로 "슈퍼관리자인가"에 각각 답한다. 다행히 후자는 `admin_roles`/
`admin_role_assignments` 테이블 자신을 보호하는 정책 2개에만 쓰여 블라스트 반경이
좁다 - 다른 테이블 정책은 전부 전자만 쓴다. 이 두 시스템의 관계(신규 RBAC로
전환 중인지, 병행 운영인지)는 [[project_deferred-rbac-and-type-infra]]에서 QA 루프
종료 후 논의하기로 이미 보류된 주제라 여기서는 존재만 기록한다.

### JWT 클레임 방식은 채택되지 않았다

과거 인시던트 문서(`claudedocs/users-rls-infinite-recursion-fix.md`, 이제 2세대 전
구식 문서 - 그 문서가 기술하는 3개 재귀 정책은 현재 존재하지 않는다)가 제안했던
"auth.jwt() 클레임 기반 RLS"(Phase 5)는 실제로 도입되지 않았다(정책 150개 중
`jwt` 참조 0건). 대신 SECURITY DEFINER 함수 방식으로 재귀 문제를 풀었다 - 이 결정을
뒤집을 이유가 지금은 없다.

### `company_subscription_price_locks`는 RLS는 켜져있는데 정책이 0개

74개 RLS 활성 테이블 중 이 테이블만 정책이 하나도 없어 기본적으로 전체 차단이다.
확인 결과 이 테이블을 읽는 두 곳(`api/subscription/price-preview`,
`api/admin/payments/[id]/refund`) 모두 서비스롤 클라이언트를 쓰고 있어(RLS 자체를
우회) 실질적 문제는 없다 - 의도된 상태로 보고 조치하지 않는다.

## 앱(TypeScript) 쪽에도 같은 모양의 미채택 문제가 있다

RLS가 DB 레벨 안전망이라면, 실제 세밀한 인가는 API 라우트가 담당한다(과거 인시던트
문서의 철학과 일치). 그런데 `src/lib/auth/permissions.ts`에 이미 공용 헬퍼
`isAdminUser()`가 있는데도, 관리자 role 배열을 `.includes(...)`로 직접 인라인 반복하는
파일이 **22개** 있다(`convert-trial`, `proxy-billing-auth`, `users/[id]`,
`users/invite`, `campaigns` 등). RLS 쪽 헬퍼가 처음엔 없다가 QA 라운드를 거치며 생긴
것과 마찬가지로, 이 TS 헬퍼도 아직 완전히 퍼지지 않은 상태다 - **패턴1의 라이브
재발 경로는 지금은 DB보다 오히려 앱 코드 쪽에 있다.**

주의할 점 하나: `isAdminUser()`의 판정 기준이 RLS의 `am_i_admin_or_legacy_owner()`와
미묘하게 다르다 - TS 버전은 `simple_role === 'manager'`도 관리자로 인정하지만 RLS
버전은 `simple_role === 'admin'`만 인정한다. 이 차이가 의도된 정책인지 드리프트인지는
확인하지 않았다(정책 판단이 필요해 보임 - 아래 참고).

## 남은 선택지 (코드 변경 없음, 사용자 결정 필요)

두 가지 후속 작업이 가능하다. 둘 다 이번 세션에서 실행하지 않았다 - 블라스트 반경과
성격이 크게 달라 각각 독립적인 판단이 필요하다.

1. **RLS 쪽 110개 정책의 인라인 서브쿼리를 헬퍼 함수 호출로 교체.** 53개 테이블에
   걸쳐 있고 라이브 보안 정책을 직접 건드리는 대규모 기계적 마이그레이션이다. 86차
   전례(드라이런 → `pg_policies` 재조회 검증 → 사용자 승인 → `ALTER POLICY`로 적용,
   DROP+CREATE의 차단 공백 구간 회피)를 그대로 따라야 하고, `authenticated` 역할의
   실제 JWT로 검증해야 한다(서비스롤 클라이언트는 RLS를 우회하므로 테스트가 항상
   "통과"로 나와 의미가 없다). 이득은 "다음 전역 인가규칙 변경이 43KB짜리 마이그레이션
   대신 함수 하나 수정으로 끝난다"는 것.
2. **앱 쪽 22개 파일의 인라인 role 배열을 `isAdminUser()` 호출로 교체.** 순수 TypeScript
   변경이라 마이그레이션이 없고 블라스트 반경이 훨씬 작다. 단, 위에서 발견한
   `manager`/`admin` 판정 차이를 먼저 정리해야 한다 - 그대로 교체하면 `manager`
   역할의 동작이 파일별로 달라질 수 있어 정책 판단이 선행돼야 한다.

## 이 문서를 갱신해야 할 때

- 새 RLS 정책을 추가할 때 `company_id`/활성여부/역할을 다시 서브쿼리로 짜지 말고 위
  5개 함수 중 맞는 것을 먼저 찾는다.
- `users` 테이블에 새 정책을 추가하려면 이 문서의 "FORCE ROW LEVEL SECURITY" 경고와
  74차 QA(20260809000003)의 재귀 재발 사례를 먼저 읽는다.
- `claudedocs/users-rls-infinite-recursion-fix.md`는 이제 참고용 구버전 기록이다 -
  거기 나온 3개 정책은 라이브에 존재하지 않는다.
