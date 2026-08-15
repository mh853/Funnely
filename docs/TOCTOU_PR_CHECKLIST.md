# 동시성(TOCTOU) 방지 - PR 체크리스트 항목

작성일 2026-08-15. QA 루프에서 6개 라운드(13/41/46/61/62/81차)에 걸쳐 반복 확인된
"확인 후 쓰기(check-then-act)가 원자적이지 않아 동시요청 시 한도/중복방지가 뚫리는"
패턴을 구조적으로 막기 위한 문서다. 이 패턴은 발생 지점마다 성격이 달라(무엇을
누가 언제 동시에 시도할 수 있는지가 매번 다름) 한 번의 마이그레이션으로 일괄
해결할 수 없다 - 그래서 다른 7개 패턴과 달리 **코드/함수 통일이 아니라 PR 체크리스트
항목화가 구조적 해결책**이다.

## 이미 확립된 해결 패턴 - DB 트리거 + advisory lock

앱 코드(API 라우트)에서 "조회해서 한도 확인 → 통과하면 INSERT"를 하면, 동시에 두
요청이 오면 둘 다 조회 시점엔 한도 안에 있다고 보여서 둘 다 통과해버린다. 이
코드베이스가 실제로 쓰는 해결책은 **애플리케이션 코드가 아니라 DB 트리거**다 -
어느 API 경로로 들어오든 트리거가 걸리므로 새 진입점이 생겨도 자동으로 보호된다.

```sql
-- 실제 패턴 (20260712000000_enforce_plan_limits_atomically.sql)
CREATE OR REPLACE FUNCTION enforce_landing_page_limit() RETURNS TRIGGER AS $$
DECLARE
  v_max_pages INTEGER;
  v_current_count INTEGER;
BEGIN
  -- 같은 회사에 대한 동시 INSERT를 직렬화 (트랜잭션 종료 시 자동 해제)
  PERFORM pg_advisory_xact_lock(hashtext(NEW.company_id::text));

  SELECT sp.max_landing_pages INTO v_max_pages
  FROM company_subscriptions cs
  JOIN subscription_plans sp ON sp.id = cs.plan_id
  WHERE cs.company_id = NEW.company_id
    AND cs.status IN ('active', 'trial', 'past_due')
  ORDER BY cs.created_at DESC LIMIT 1;

  -- (이하 카운트 조회 후 한도 초과시 RAISE EXCEPTION)
  ...
END;
$$;
```

핵심은 `pg_advisory_xact_lock(hashtext(<잠글 기준 키>::text))`를 한도/중복 체크
**직전**에 걸어, 같은 키(보통 `company_id`)에 대한 동시 트랜잭션을 직렬화하는 것 -
트랜잭션이 끝나면 자동 해제되므로 별도 unlock이 필요 없다. 순수 중복방지(한도 체크가
아니라 "이미 있으면 막기")는 advisory lock 대신 **DB 유니크 제약**으로 푸는 경우가
더 많다(예: `company_invitations`의 `.eq('status','pending')` 조건부 UPDATE로
"먼저 처리한 요청만 성공" 패턴 - `src/app/api/users/invite/accept/route.ts`).

## 이미 보호된 것으로 확인된 지점 (마이그레이션에 advisory lock 존재)

- `20260712000000_enforce_plan_limits_atomically.sql` - 랜딩페이지/팀원 수 등 플랜
  한도 (61차)
- `20260714000002_allow_plan_limits_during_cancelled_grace_period.sql` - 위 한도
  체크의 예외 케이스 보완
- `20260726000000_enforce_lead_dedup_atomically.sql` - 리드 중복생성 방지 (13차)
- `20260731000001_fix_seat_limit_trigger_ignores_inactive_users.sql` - 좌석한도
  트리거가 비활성 사용자를 잘못 세던 버그 수정
- `20260802000006_enforce_seat_limit_on_accept.sql` - 초대 수락 시점 좌석한도 (62차)
- `20260802000008_enforce_seat_limit_on_reactivate.sql` - 재활성화 시점 좌석한도

이 6개는 트리거 레벨 보호라 **어느 API 라우트에서 INSERT/UPDATE를 하든 자동으로
걸린다** - 새 진입점을 추가해도 이 트리거들이 지키는 한도는 재차 뚫리지 않는다.

## 주의: "37곳"이라는 숫자를 검증 없이 인용하지 말 것

매트릭스(`claudedocs/structural-fixes-priority-matrix.md`)의 기존 기록에 "pg_advisory/
FOR UPDATE 패턴 37곳"이라는 수치가 있으나, 이 세션에서 애플리케이션 코드(`src/`,
`supabase/functions/`)를 grep한 결과 `pg_advisory`/`FOR UPDATE` 문자열은 **0건**이었다
- 보호 로직이 전부 DB 트리거/마이그레이션 안에 있어 앱 코드에서는 안 보이기 때문일
수도 있고, 애초에 "37"이 다른 기준(예: check-then-act로 의심되는 지점 전체를 넓게 셈)
으로 집계된 숫자일 수도 있다 - 이 세션에서는 그 원본 집계 방법을 재현하지 않았다.
**이 문서는 "37곳 전수 분류"를 시도하지 않았다** - 애초에 Tier 3b의 목표 자체가
개별 지점을 전부 찾아 고치는 게 아니라, 다음에 새 기능을 만들 때 이 질문을 하게
만드는 것이었다(원래 계획: "케이스별 설계 필요, PR체크리스트화가 현실적 대안"). 특정
기능에 동시성 문제가 의심되면 그때 그 기능만 좁혀서 조사할 것 - 전수조사를 하려면
별도 세션으로 분리해야 한다.

## PR 체크리스트 항목 (신규 기능/API 추가 시 확인)

- [ ] 이 API가 "존재 확인 → 없으면 생성" 또는 "개수 세기 → 한도 안이면 허용" 형태의
      check-then-act를 하는가?
- [ ] 그렇다면: 같은 회사/같은 리소스에 대해 동시에 두 요청이 오면 실제로 무슨 일이
      일어나는지 직접 따져봤는가? (둘 다 통과? 중복 생성? 한도 초과?)
- [ ] 방지가 필요하다면 다음 중 하나를 적용했는가?
      - **한도 체크류**(플랜 좌석/페이지 수 등): DB 트리거 + `pg_advisory_xact_lock
        (hashtext(<company_id 등 기준 키>::text))` - 위 6개 마이그레이션을 템플릿으로
        재사용
      - **중복방지류**(같은 요청 두 번 처리 금지): DB 유니크 제약, 또는
        `.eq('status', 'pending')`류 조건부 UPDATE로 "먼저 처리한 쪽만 성공"시키고
        영향받은 행이 0건이면 이미 처리된 것으로 간주(예: `users/invite/accept`의
        초대 수락 클레임 패턴)
      - 서비스롤로 RLS를 우회하는 라우트라면, 위 보호가 앱 코드가 아니라 **트리거에**
        있는지 재확인 - 앱 레벨 체크만 있으면 서비스롤 자체가 그 체크를 우회하는
        경로가 될 수 있다
- [ ] 애플리케이션 레벨에서만 막아뒀다면(트리거 아님), 왜 DB 레벨 보호가 불필요한지
      한 줄로 남겼는가?
