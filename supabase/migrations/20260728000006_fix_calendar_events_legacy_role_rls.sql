-- calendar_events의 관리(FOR ALL)/조회(SELECT) RLS 정책이 여전히 'hospital_owner'/
-- 'hospital_admin'이라는 폐기된 role 값을 확인하고 있다. 이 값들은
-- 20251213000008_migrate_hospital_roles_to_company.sql에서 전량
-- 'company_owner'/'company_admin'으로 치환됐고 그 이후 어떤 행도 이 값을 가질 수
-- 없어, 이 EXISTS 절은 영원히 매칭되지 않는 죽은 조건이었다(2026-07-11 전사
-- 크로스테넌트 RLS 감사에서 7개 테이블을 고칠 때 calendar_events는 누락됨). 결과적으로
-- 회사 관리자가 팀원에게 배정된 일정을 조회/수정/삭제할 수 없고, 오직 원 작성자
-- (created_by)만 가능한 상태였다. 이 세션에서 반복적으로 써온 표준 패턴(레거시 role
-- 4종 + simple_role='admin' 폴백)으로 맞춘다.

DROP POLICY IF EXISTS "Users can view their assigned events" ON calendar_events;
CREATE POLICY "Users can view their assigned events"
  ON calendar_events FOR SELECT
  USING (
    auth.uid() = ANY(assigned_to)
    OR created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND company_id = calendar_events.hospital_id
        AND (
          simple_role = 'admin'
          OR role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
        )
    )
  );

DROP POLICY IF EXISTS "Users can manage their events" ON calendar_events;
CREATE POLICY "Users can manage their events"
  ON calendar_events FOR ALL
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
        AND company_id = calendar_events.hospital_id
        AND (
          simple_role = 'admin'
          OR role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
        )
    )
  );
