-- privacy_policies/tracking_pixels 둘 다 UPDATE/INSERT RLS에 role 검사가 전혀
-- 없어(SELECT처럼 company_id 소속만 확인) 일반 팀원도 브라우저 콘솔에서 같은
-- supabase 클라이언트로 직접 호출하면 회사의 개인정보 동의 문구·광고 픽셀 ID를
-- 임의로 변경할 수 있었다(67차 QA 확인). privacy-policy 페이지는 클라이언트에서
-- isAdminUser로 입력을 readOnly 처리하지만 실제 강제는 RLS뿐이었고,
-- tracking-pixels 페이지는 그런 클라이언트 체크조차 없었다.
-- 두 페이지가 실제 쓰는 isAdminUser 기준(레거시 role 4종 + simple_role
-- IN ('admin','manager'))으로 UPDATE/INSERT를 맞춘다. SELECT는 랜딩페이지
-- 빌더 등에서 일반 팀원도 조회해야 해서 company_id 소속 기준 그대로 둔다.

-- 검증 중 발견: 어느 마이그레이션 파일에도 없는(즉 대시보드 등에서 직접 적용된)
-- "Users can manage their company privacy policies"(FOR ALL, role검사 없음)와
-- 중복 SELECT 정책 "Users can view their company privacy policies"가 실제
-- 프로덕션에 남아있었다 - permissive 정책은 OR로 합쳐지므로 이 정책이 남아있으면
-- 아래에서 아무리 role검사를 추가해도 무의미하다. 반드시 함께 제거한다.
DROP POLICY IF EXISTS "Users can manage their company privacy policies" ON privacy_policies;
DROP POLICY IF EXISTS "Users can view their company privacy policies" ON privacy_policies;

DROP POLICY IF EXISTS "Users can update their company's privacy policies" ON privacy_policies;
DROP POLICY IF EXISTS "Admins can update their company's privacy policies" ON privacy_policies;
CREATE POLICY "Admins can update their company's privacy policies"
ON privacy_policies FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.company_id = privacy_policies.company_id
    AND (
      users.simple_role IN ('admin', 'manager')
      OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
    )
  )
);

DROP POLICY IF EXISTS "Users can insert their company's privacy policies" ON privacy_policies;
DROP POLICY IF EXISTS "Admins can insert their company's privacy policies" ON privacy_policies;
CREATE POLICY "Admins can insert their company's privacy policies"
ON privacy_policies FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.company_id = privacy_policies.company_id
    AND (
      users.simple_role IN ('admin', 'manager')
      OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
    )
  )
);

DROP POLICY IF EXISTS "Users can update their company tracking pixels" ON tracking_pixels;
DROP POLICY IF EXISTS "Admins can update their company tracking pixels" ON tracking_pixels;
CREATE POLICY "Admins can update their company tracking pixels"
ON tracking_pixels FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.company_id = tracking_pixels.company_id
    AND (
      users.simple_role IN ('admin', 'manager')
      OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
    )
  )
);

DROP POLICY IF EXISTS "Users can insert their company tracking pixels" ON tracking_pixels;
DROP POLICY IF EXISTS "Admins can insert their company tracking pixels" ON tracking_pixels;
CREATE POLICY "Admins can insert their company tracking pixels"
ON tracking_pixels FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()
    AND users.company_id = tracking_pixels.company_id
    AND (
      users.simple_role IN ('admin', 'manager')
      OR users.role IN ('company_owner', 'company_admin', 'hospital_owner', 'hospital_admin')
    )
  )
);
