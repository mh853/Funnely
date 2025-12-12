-- Phase 7: 고급 분석 및 리포팅 시스템
-- 목적: 비즈니스 성과 분석 및 리포트 생성을 위한 테이블 생성

-- 1. 리포트 템플릿 테이블
CREATE TABLE IF NOT EXISTS report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('conversion', 'performance', 'roi', 'channel', 'custom')),
  description TEXT,
  config JSONB NOT NULL DEFAULT '{}',
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. 생성된 리포트 테이블
CREATE TABLE IF NOT EXISTS generated_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES report_templates(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  data JSONB NOT NULL DEFAULT '{}',
  generated_by UUID REFERENCES users(id) ON DELETE SET NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. 알림 설정 테이블
CREATE TABLE IF NOT EXISTS notification_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('new_lead', 'status_change', 'goal_achieved', 'report_ready')),
  channel TEXT NOT NULL CHECK (channel IN ('email', 'web_push', 'in_app')),
  enabled BOOLEAN DEFAULT true,
  config JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, type, channel)
);

-- 4. 알림 로그 테이블
CREATE TABLE IF NOT EXISTS notification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);

-- 5. 성과 목표 테이블
CREATE TABLE IF NOT EXISTS performance_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  metric TEXT NOT NULL CHECK (metric IN ('leads', 'conversions', 'revenue', 'conversion_rate')),
  target_value DECIMAL(10, 2) NOT NULL,
  current_value DECIMAL(10, 2) DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'achieved', 'failed', 'cancelled')),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_report_templates_type ON report_templates(type);
CREATE INDEX IF NOT EXISTS idx_report_templates_created_by ON report_templates(created_by);

CREATE INDEX IF NOT EXISTS idx_generated_reports_company ON generated_reports(company_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_template ON generated_reports(template_id);
CREATE INDEX IF NOT EXISTS idx_generated_reports_period ON generated_reports(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_generated_reports_generated_at ON generated_reports(generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_settings_user ON notification_settings(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_settings_type ON notification_settings(type);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user ON notification_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_notification_logs_read ON notification_logs(read, sent_at DESC);
CREATE INDEX IF NOT EXISTS idx_notification_logs_sent_at ON notification_logs(sent_at DESC);

CREATE INDEX IF NOT EXISTS idx_performance_goals_company ON performance_goals(company_id);
CREATE INDEX IF NOT EXISTS idx_performance_goals_status ON performance_goals(status);
CREATE INDEX IF NOT EXISTS idx_performance_goals_period ON performance_goals(period_start, period_end);

-- RLS 정책 설정
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE performance_goals ENABLE ROW LEVEL SECURITY;

-- Company Owner/Admin은 모든 접근 가능
CREATE POLICY report_templates_admin ON report_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY generated_reports_admin ON generated_reports
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

CREATE POLICY notification_settings_owner ON notification_settings
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY notification_logs_owner ON notification_logs
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY performance_goals_admin ON performance_goals
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.role IN ('company_owner', 'company_admin')
    )
  );

-- 변경 완료 로그
DO $$
BEGIN
  RAISE NOTICE 'Analytics and reporting tables created successfully';
END $$;
