-- Google Sheets 동기화 설정 테이블
CREATE TABLE IF NOT EXISTS sheet_sync_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  sheet_name TEXT DEFAULT 'Sheet1',
  landing_page_id UUID REFERENCES landing_pages(id) ON DELETE SET NULL,
  column_mapping JSONB DEFAULT '{"name": "이름", "phone": "전화번호", "email": "이메일"}'::jsonb,
  is_active BOOLEAN DEFAULT true,
  sync_interval_minutes INTEGER DEFAULT 60, -- 동기화 주기 (분)
  last_synced_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 동기화 로그 테이블
CREATE TABLE IF NOT EXISTS sheet_sync_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  spreadsheet_id TEXT NOT NULL,
  sheet_name TEXT,
  imported_count INTEGER DEFAULT 0,
  total_rows INTEGER DEFAULT 0,
  duplicates_skipped INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX IF NOT EXISTS idx_sheet_sync_configs_company ON sheet_sync_configs(company_id);
CREATE INDEX IF NOT EXISTS idx_sheet_sync_configs_active ON sheet_sync_configs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_sheet_sync_logs_company ON sheet_sync_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_sheet_sync_logs_created ON sheet_sync_logs(created_at DESC);

-- RLS 정책
ALTER TABLE sheet_sync_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sheet_sync_logs ENABLE ROW LEVEL SECURITY;

-- 조회 권한
CREATE POLICY "Users can view their company's sheet sync configs"
ON sheet_sync_configs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.company_id = sheet_sync_configs.company_id
    AND users.id = auth.uid()
  )
);

CREATE POLICY "Users can view their company's sheet sync logs"
ON sheet_sync_logs FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.company_id = sheet_sync_logs.company_id
    AND users.id = auth.uid()
  )
);

-- 수정 권한 (admin/owner만)
CREATE POLICY "Admins can manage sheet sync configs"
ON sheet_sync_configs FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.company_id = sheet_sync_configs.company_id
    AND users.id = auth.uid()
    AND users.role IN ('admin', 'owner')
  )
);

-- Service role 접근 허용 (cron job용)
CREATE POLICY "Service role can insert sync logs"
ON sheet_sync_logs FOR INSERT
WITH CHECK (true);

-- leads 테이블에 source 컬럼 추가 (없는 경우)
ALTER TABLE leads ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'landing_page';

COMMENT ON TABLE sheet_sync_configs IS 'Google Sheets 자동 동기화 설정';
COMMENT ON TABLE sheet_sync_logs IS 'Google Sheets 동기화 로그';
COMMENT ON COLUMN leads.source IS '리드 유입 경로 (landing_page, google_sheets, manual 등)';
