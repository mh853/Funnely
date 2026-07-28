-- 구글 시트 동기화는 회사마다 다른 자격증명이 아니라 전체 회사가 공유하는
-- 서비스 계정 하나로 이뤄진다(각 회사가 자기 시트를 이 계정에 공유하는 방식).
-- 그런데 sheet_sync_configs.spreadsheet_id에는 유니크 제약이 전혀 없어, 이미
-- 다른 회사가 등록해 둔(=공유해 둔) spreadsheet_id를 그대로 자기 회사 이름으로
-- 등록하면 직전에 추가한 API 레벨 소유권 검증("이 회사의 sheet_sync_configs에
-- 이 spreadsheetId가 등록되어 있는가")을 그대로 통과해버린다 - 등록 자체를
-- 막는 제약이 없었기 때문이다. (spreadsheet_id, sheet_name) 전체 시스템 유니크로
-- 이 경로를 원천 차단한다. 같은 회사가 같은 스프레드시트의 다른 탭(sheet_name)을
-- 별도 설정으로 등록하는 것은 정상 유스케이스라 spreadsheet_id 단독이 아니라
-- (spreadsheet_id, sheet_name) 조합으로 유니크를 건다 - 부수 효과로 같은 회사가
-- 동일 조합을 실수로 두 번 등록해 매 동기화마다 같은 시트를 중복 호출하던 문제도
-- 함께 막힌다.
ALTER TABLE sheet_sync_configs
  ADD CONSTRAINT sheet_sync_configs_spreadsheet_sheet_unique
  UNIQUE (spreadsheet_id, sheet_name);

-- sheet_sync_configs RLS 정책이 마이그레이션 파일 상으로는 users.role IN
-- ('admin', 'owner')를 검사하는데, 이 값들은 user_role enum에 존재한 적 없다.
-- 실제 라이브 정책은 이미 simple_role='admin' 기준으로(트래킹 안 된 수동 SQL
-- 편집으로 추정) 정상 동작 중이지만, 이 마이그레이션 파일 자체를 그대로
-- 재실행하는 모든 신규 환경(로컬 supabase db reset, 스테이징, 재해복구)에서는
-- 이 문제가 재현되어 관리자를 포함해 아무도 시트 동기화 설정을 만들 수 없게
-- 된다. 파일을 실제 라이브 상태와 일치시켜 드리프트를 없앤다.
DROP POLICY IF EXISTS "Admins can manage sheet sync configs" ON sheet_sync_configs;
CREATE POLICY "Admins can manage sheet sync configs"
  ON sheet_sync_configs
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.company_id = sheet_sync_configs.company_id
        AND users.id = auth.uid()
        AND users.simple_role = 'admin'
    )
  );
