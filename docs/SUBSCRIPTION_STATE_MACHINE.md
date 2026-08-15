# 구독 상태전환 지도 (company_subscriptions)

작성일 2026-08-15. QA 루프 85~88차에서 반복 확인된 "구독 상태전환 시 연관필드 정리 누락"
패턴(8번)을 구조적으로 닫기 위해, `company_subscriptions`를 쓰는 모든 진입점을 직접 코드
추적으로 확인해 작성했다. 다음에 이 도메인을 건드리는 사람(사람이든 에이전트든)이 처음부터
다시 추적하지 않도록 하는 것이 이 문서의 목적이다.

## 핵심 불변식 2가지

새 진입점을 추가하거나 기존 진입점을 수정할 때 반드시 지켜야 하는 규칙.

### 1. `pending_plan_id` / `pending_billing_cycle`은 예약된 다운그레이드다

`toss-billing-payment` 에지 함수의 mode 없는(기본) 갱신 분기는 이 컬럼이 있으면 **무조건
그 플랜/가격으로 청구**한다. 구독이 `active`로 전환되는 모든 지점에서 이 예약이 여전히
유효한 게 아니라면(= 사용자가 새로 다른 플랜을 선택한 것이라면) 반드시 함께 비워야 한다.
안 비우면 몇 주~몇 달 전에 예약해둔 다운그레이드가 전혀 무관한 시점에 조용히 적용된다
(58차 QA).

**지키는 곳**: `subscription/cancel`(취소 시), `subscription/convert-trial`(planId 전달
시), `admin/subscriptions/[id]` PATCH(→active 전환 시, 무조건)

### 2. `grace_period_end`는 "최초 결제실패 여부" 판정에 쓰인다

`toss-billing-payment`의 `isFirstFailure` 판정은 `status`가 아니라 `grace_period_end`의
존재 여부로 "이번이 첫 실패인가"를 가린다(57차 QA) — `convert-trial`이 `status`를
낙관적으로 먼저 `active`로 써버리기 때문에 status는 신뢰할 수 없어서다. 따라서:

- 지금 실제로 `past_due` 유예기간이 진행 중이면 **절대 건드리면 안 된다** (건드리면 재시도가
  매번 "최초 실패"로 오판되어 유예기간이 계속 리셋됨, 57차 QA).
- `past_due`를 거쳤다가 다른 상태로 넘어가는 경우(재구독, 갱신 성공, 만료 확정 등)는
  stale한 값이 남지 않도록 **명시적으로 null 처리**해야 한다 (안 비우면 나중에 진짜
  `past_due`에 진입할 때 이 값을 그대로 재사용해 유예기간이 0일로 붕괴함, 58차 QA).

## 진입점 전수 지도

`company_subscriptions`에 쓰기(INSERT/UPDATE)가 있는 곳만 나열한다. 읽기만 하는 곳(예:
`proxy-billing-auth`, `users/invite/accept`)은 확인 후 제외했다.

| # | 위치 | 트리거 | 무엇을 하는가 | 두 불변식 처리 |
|---|------|--------|----------------|------------------|
| 1 | `api/auth/signup` | 신규 가입 | INSERT (trial 신규생성) | 해당없음(신규행) |
| 2 | `api/subscription/start-trial` | 체험 시작 | INSERT/UPDATE, has_used_trial 중복방지 | 해당없음(신규/최초) |
| 3 | `api/subscription/cancel` | 셀프서비스 취소 | UPDATE →cancelled | 둘 다 명시적으로 클리어 |
| 4 | `api/subscription/reactivate` | 셀프서비스 재활성화 | UPDATE, wasSuspended 판단 | - |
| 5 | `api/subscription/rollback-plan-change` | 플랜변경 롤백 | UPDATE/DELETE 분기 | - |
| 6 | `api/subscription/cancel-pending-change` | 예약 취소만 | UPDATE, pending만 정리 | pending 클리어가 본체 |
| 7 | `api/subscription/convert-trial` | 체험→유료 전환 / past_due 재시도 | UPDATE ×3(본체+실패시 롤백 2곳) | pending은 `planId` 있을 때만(**항상 참** - 아래 참고), grace는 `rollbackStatus !== 'past_due'`일 때만 |
| 8 | `api/admin/subscriptions/[id]` | 관리자 수동 조정 | PATCH, status별 분기 | →active 전환 시 pending 둘 다 무조건 클리어(cancelled_at도). grace는 기간을 리셋하는 경우(periodEndInPast\|\|neverHadPeriod)에만 클리어. →suspended 전환 시엔 pending 둘 다 + grace까지 셋 다 무조건 클리어 |
| 9 | `api/admin/payments/[id]/refund` | 환불 처리 | UPDATE, 플랜 복원+price_locks | - |
| 10 | `api/admin/companies/[id]` | 회사 비활성화 | UPDATE →suspended | - |
| 11 | `api/user/account` | 회원 탈퇴(마지막 owner) | UPDATE →cancelled | **둘 다 클리어 안 함** - 아래 "확인된 무해 사례" 참고 |
| 12 | `api/cron/daily-tasks` (processSubscriptionRenewals) | 매일 배치 | UPDATE →past_due (유예 시작) | grace는 건드리지 않음(진행중이므로 맞음) |
| 12 | `api/cron/daily-tasks` (checkSubscriptionExpiry) | 매일 배치 | UPDATE →expired | grace 명시적 클리어 |
| 13 | `supabase/functions/toss-billing-payment` | 결제 웹훅/직접호출(정기갱신·업그레이드·다운그레이드예약) | 도메인의 실제 핵심 상태기계 | mode별로 다름 - 아래 참고 |
| 14 | `supabase/functions/toss-billing-auth` | 카드/빌링키 등록 | UPDATE (billing_key/customer_key/card_info만) | 해당없음(plan_id/status 안 건드림) |

**#13, #14는 이 저장소에서 `supabase/functions/`가 gitignore 대상이라 git 이력·PR 리뷰에
안 걸린다** - 실제로는 도메인에서 가장 정교하고(10회+ QA라운드에서 발견된 버그가 주석으로
누적) 가장 위험도 높은 코드가 버전관리 밖에 있다는 뜻이다. 수정 시 `supabase functions
deploy`로 별도 배포해야 반영된다.

## 왜 "14곳을 단일 함수로 통합"하지 않는가

Tier 2 계획 초안에는 "14개 진입점을 단일 함수로 합친다"고 적혀 있었으나, 실제로 코드를
전수 추적한 결과 이 방향은 기각한다. 이유 두 가지.

1. **런타임이 다르다.** #1~12는 Next.js(Node) API 라우트, #13~14는 Supabase Edge
   Function(Deno, `esm.sh` import)이다. 이 둘을 하나의 함수로 묶으려면 공유 패키지 빌드
   체계가 새로 필요하다 - 리팩터가 아니라 별도 인프라 작업이다.
2. **진짜 위험한 전환 로직은 이미 한 곳에 있다.** 정기갱신·업그레이드 프로레이션·다운그레이드
   예약처럼 실제로 돈이 걸린 계산은 전부 `toss-billing-payment` 안에 있다. 나머지
   Next.js 라우트들은 대부분 서로 다른 컨텍스트(셀프서비스/관리자/크론/탈퇴)에서 상태값
   몇 개만 바꾸는 얇은 진입점이라, 강제로 합치면 각 QA라운드가 힘들게 찾아낸 컨텍스트별
   예외(예: past_due 중엔 grace_period_end를 절대 안 건드림)를 오히려 깨뜨릴 위험이 크다.

## 확인된 무해 사례 (조사 중 "버그처럼 보였지만 아니었던" 것들)

### convert-trial의 `if (planId)` 조건부 클리어

`convert-trial/route.ts`는 요청에 `planId`가 있을 때만 `pending_plan_id`/
`pending_billing_cycle`을 비운다(코드상 조건부). 처음엔 "planId 없이 호출되면 예약된
다운그레이드가 안 지워진 채 남는다"는 가설을 세웠으나, 이 라우트의 **유일한 실사용
호출부**(`NewSubscriptionClient.tsx:434`, `handleSelectPlan`)는 사용자가 플랜 카드를
클릭하는 흐름이라 `planId: plan.id`를 예외 없이 채워 보낸다. `planId`가 비는 실사용 경로
자체가 없다 - 조건은 방어적 코드이지만 항상 참이라 실질적으로 문제되지 않는다.

### 회원탈퇴(user/account)가 pending_plan_id를 안 비우는 것

`cancel`과 달리 `user/account`(회원탈퇴)는 `status: 'cancelled'`로 전환하면서
`pending_plan_id`/`pending_billing_cycle`을 비우지 않는다. 이 값이 나중에 실제로
잘못된 청구를 유발할 수 있는지 추적한 결과:

- **`reactivate`(셀프서비스) 라우트 자체가 pending 둘 다 무조건 비운다** (54-58줄 주석,
  60차 QA) - 애초에 "suspended 출신"을 겨냥한 처리였지만 조건 없이 클리어하므로
  "cancelled 출신"인 이 케이스도 그대로 커버한다. 즉 이 분기가 실행된 다음 세션이 남아있는
  누군가가 실제로 재구독 버튼을 눌러도, 그 전환 자체가 stale 값을 지운다 - 세션이
  살아있는지 여부와 무관하게 안전하다.
- 관리자가 `admin/subscriptions/[id]` PATCH로 수동 재활성화하는 경로도 →active 전환 시
  `pending_plan_id`/`pending_billing_cycle`을 **무조건** 비우므로, 지원팀이 이 회사를
  되살리는 경로 역시 안전하다.
- 크론(`processSubscriptionRenewals`/`checkSubscriptionExpiry`)은 `status IN
  (active, past_due)` 또는 `trial`만 대상으로 하고 `cancelled`는 갱신 대상에서 아예
  제외된다. `calculateRevenue`가 `cancelled`도 조회하긴 하나 이건 매출 리포트용 SELECT일
  뿐 `company_subscriptions`에 쓰지 않는다.
- 세션 관점의 방어와 별개로, 이 탈퇴 분기는 대상 구독의 Toss 빌링키를 전부
  `revokeBillingKey`로 해지한다(83차 QA). 설령 위 세 경로가 전부 뚫린다 해도 Toss에
  등록된 결제수단 자체가 없어, 재개된 구독의 다음 청구 시도는 성공이 아니라 결제실패
  (`past_due` 재진입)로 끝난다 - 잘못된 가격으로 "성공 청구"될 경로는 없다.

결론: 이 stale 값에 실제로 도달해 청구에 영향을 줄 수 있는 라이브 경로가 없고, 설령 앞의
세 방어가 전부 무너지는 가정을 하더라도 빌링키 해지가 마지막 안전망이 된다. 코드 변경 없이
이 문서에 이유를 남기는 것으로 충분하다고 판단.

## 기타 발견 (조치 불필요, 기록만)

- `company_subscriptions`에는 `trial_end`와 `trial_end_date` 두 컬럼이 있는데, 실제로
  읽고 쓰는 코드는 전부 `trial_end_date`다. `trial_end`는 죽은 컬럼 후보로 보이나 이번
  조사 범위 밖이라 삭제하지 않았다.
- `updated_at`을 명시적으로 세팅하는 곳과 DB 트리거에 맡기는 곳이 섞여 있으나, 트리거가
  실제로 존재함을 확인했으므로 결과에는 차이가 없다.
- `convert-trial`의 결제실패 롤백(129-143줄)은 `status`와 조건부 `grace_period_end`만
  원복하고, 같은 요청에서 낙관적으로 먼저 써둔 `plan_id`/`billing_cycle`/pending 클리어는
  원복하지 않는다. `past_due` 사용자가 **다른** 플랜을 선택했는데 그 결제가 실패하면,
  상태는 다시 `past_due`로 돌아가지만 `plan_id`는 실패한 새 플랜을 계속 가리킨 채 유예기간에
  들어간다 - 좁은 범위의 정책 판단 소지가 있는 잔여 항목이라 이번 세션에서는 수정하지 않고
  기록만 남긴다.

## 이 문서를 갱신해야 할 때

- 새 진입점이 `company_subscriptions`를 UPDATE/INSERT하게 되면 위 표에 행을 추가한다.
- 위 두 불변식(pending_plan_id 계열, grace_period_end) 중 하나라도 새로 건드리는 코드를
  작성하면, 그 진입점이 지금 상태(active/past_due/trial/cancelled 등) 전이의 어느
  지점에 있는지 먼저 이 문서의 기존 사례와 대조한다.
