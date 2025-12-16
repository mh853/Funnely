-- ============================================================================
-- Admin Enhancement Schema Migration
-- Created: 2025-12-16
-- Description: 고객사 관리 어드민 시스템 고도화를 위한 데이터베이스 스키마
-- ============================================================================

-- ============================================================================
-- 1. Customer Health Scores (고객 건강도 점수)
-- ============================================================================
CREATE TABLE IF NOT EXISTS customer_health_scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  score INTEGER NOT NULL CHECK (score >= 0 AND score <= 100),
  risk_level TEXT NOT NULL CHECK (risk_level IN ('low', 'medium', 'high', 'critical')),
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for customer_health_scores
CREATE INDEX IF NOT EXISTS idx_health_company ON customer_health_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_health_risk ON customer_health_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_health_calculated ON customer_health_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_score ON customer_health_scores(score);

-- Comments
COMMENT ON TABLE customer_health_scores IS '고객사 건강도 점수 추적';
COMMENT ON COLUMN customer_health_scores.score IS '건강도 점수 (0-100)';
COMMENT ON COLUMN customer_health_scores.risk_level IS '위험 수준 (low, medium, high, critical)';
COMMENT ON COLUMN customer_health_scores.metrics IS '세부 지표 (loginFrequency, featureUsage, leadGenerationRate, supportTicketCount, paymentStatus)';

-- ============================================================================
-- 2. Onboarding Progress (온보딩 진행 상황)
-- ============================================================================
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  current_stage TEXT NOT NULL CHECK (current_stage IN ('signup', 'profile_setup', 'first_landing_page', 'first_lead', 'team_invite', 'completed')),
  stages JSONB NOT NULL DEFAULT '[]'::jsonb,
  completion_rate INTEGER NOT NULL DEFAULT 0 CHECK (completion_rate >= 0 AND completion_rate <= 100),
  time_to_value INTEGER, -- 첫 리드 생성까지 걸린 일수
  is_stalled BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Unique constraint: 고객사당 하나의 온보딩 진행 상황만 존재
CREATE UNIQUE INDEX IF NOT EXISTS idx_onboarding_company_unique ON onboarding_progress(company_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_onboarding_stage ON onboarding_progress(current_stage);
CREATE INDEX IF NOT EXISTS idx_onboarding_stalled ON onboarding_progress(is_stalled) WHERE is_stalled = TRUE;
CREATE INDEX IF NOT EXISTS idx_onboarding_completion ON onboarding_progress(completion_rate);

-- Comments
COMMENT ON TABLE onboarding_progress IS '고객사 온보딩 진행 상황 추적';
COMMENT ON COLUMN onboarding_progress.current_stage IS '현재 온보딩 단계';
COMMENT ON COLUMN onboarding_progress.stages IS '단계별 완료 정보 배열';
COMMENT ON COLUMN onboarding_progress.time_to_value IS '첫 리드 생성까지 소요 시간 (일)';
COMMENT ON COLUMN onboarding_progress.is_stalled IS '7일 이상 진행 없음 여부';

-- ============================================================================
-- 3. Feature Usage Tracking (기능 사용 추적)
-- ============================================================================
CREATE TABLE IF NOT EXISTS feature_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_feature_company ON feature_usage_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_feature_user ON feature_usage_tracking(user_id);
CREATE INDEX IF NOT EXISTS idx_feature_name ON feature_usage_tracking(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_used_at ON feature_usage_tracking(used_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_company_name ON feature_usage_tracking(company_id, feature_name);

-- Comments
COMMENT ON TABLE feature_usage_tracking IS '기능별 사용 추적';
COMMENT ON COLUMN feature_usage_tracking.feature_name IS '사용된 기능명 (예: landing_page_create, lead_export, analytics_view)';
COMMENT ON COLUMN feature_usage_tracking.metadata IS '추가 메타데이터 (페이지 URL, 소요 시간 등)';

-- ============================================================================
-- 4. Revenue Metrics (수익 지표)
-- ============================================================================
CREATE TABLE IF NOT EXISTS revenue_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  mrr DECIMAL(12,2) NOT NULL DEFAULT 0, -- Monthly Recurring Revenue
  arr DECIMAL(12,2) NOT NULL DEFAULT 0, -- Annual Recurring Revenue
  mrr_growth DECIMAL(5,2) DEFAULT 0, -- MoM 성장률 (%)
  arr_growth DECIMAL(5,2) DEFAULT 0, -- YoY 성장률 (%)
  breakdown JSONB NOT NULL DEFAULT '{}'::jsonb,
  projections JSONB DEFAULT '{}'::jsonb,
  calculated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Unique constraint: 기간별 하나의 지표만 존재
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_period_unique ON revenue_metrics(period_start, period_end);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_revenue_period_start ON revenue_metrics(period_start DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_calculated ON revenue_metrics(calculated_at DESC);

-- Comments
COMMENT ON TABLE revenue_metrics IS '수익 지표 (MRR, ARR)';
COMMENT ON COLUMN revenue_metrics.mrr IS '월간 반복 수익';
COMMENT ON COLUMN revenue_metrics.arr IS '연간 반복 수익';
COMMENT ON COLUMN revenue_metrics.breakdown IS '플랜별, 세그먼트별 수익 분석';
COMMENT ON COLUMN revenue_metrics.projections IS '수익 예측 (다음 월, 분기, 연말)';

-- ============================================================================
-- 5. Churn Records (이탈 기록)
-- ============================================================================
CREATE TABLE IF NOT EXISTS churn_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE SET NULL,
  churned_at TIMESTAMP WITH TIME ZONE NOT NULL,
  tenure_days INTEGER NOT NULL, -- 사용 기간 (일)
  last_mrr DECIMAL(10,2),
  reason TEXT,
  reason_category TEXT,
  feedback TEXT,
  was_preventable BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_churn_churned_at ON churn_records(churned_at DESC);
CREATE INDEX IF NOT EXISTS idx_churn_reason_category ON churn_records(reason_category);
CREATE INDEX IF NOT EXISTS idx_churn_preventable ON churn_records(was_preventable) WHERE was_preventable = TRUE;
CREATE INDEX IF NOT EXISTS idx_churn_company ON churn_records(company_id);

-- Comments
COMMENT ON TABLE churn_records IS '고객사 이탈 기록 및 분석';
COMMENT ON COLUMN churn_records.tenure_days IS '서비스 사용 기간 (일)';
COMMENT ON COLUMN churn_records.reason_category IS '이탈 사유 카테고리 (price, features, support, competition, other)';
COMMENT ON COLUMN churn_records.was_preventable IS '예방 가능한 이탈 여부';

-- ============================================================================
-- 6. Automation Workflows (자동화 워크플로우)
-- ============================================================================
CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger JSONB NOT NULL,
  actions JSONB NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_workflow_active ON automation_workflows(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_workflow_created_by ON automation_workflows(created_by);
CREATE INDEX IF NOT EXISTS idx_workflow_last_executed ON automation_workflows(last_executed_at DESC);

-- Comments
COMMENT ON TABLE automation_workflows IS '자동화 워크플로우 정의';
COMMENT ON COLUMN automation_workflows.trigger IS '트리거 조건 (type: event|schedule|condition, config: {...})';
COMMENT ON COLUMN automation_workflows.actions IS '실행할 액션 배열 (type: email|notification|webhook|status_change|ticket, config: {...})';

-- ============================================================================
-- 7. Bulk Operations (일괄 작업)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('status_change', 'plan_change', 'notification', 'feature_toggle', 'export')),
  target_companies UUID[] NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  progress JSONB NOT NULL DEFAULT '{"total": 0, "completed": 0, "failed": 0, "status": "pending"}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_bulk_type ON bulk_operations(type);
CREATE INDEX IF NOT EXISTS idx_bulk_created_by ON bulk_operations(created_by);
CREATE INDEX IF NOT EXISTS idx_bulk_created_at ON bulk_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_status ON bulk_operations((progress->>'status'));

-- Comments
COMMENT ON TABLE bulk_operations IS '일괄 작업 실행 기록';
COMMENT ON COLUMN bulk_operations.target_companies IS '대상 회사 ID 배열';
COMMENT ON COLUMN bulk_operations.progress IS '진행 상황 (total, completed, failed, status)';

-- ============================================================================
-- 8. Audit Logs (감사 로그)
-- ============================================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_email TEXT NOT NULL,
  actor_role TEXT,
  ip_address INET,
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id UUID,
  resource_name TEXT,
  changes JSONB,
  metadata JSONB DEFAULT '{}'::jsonb,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'critical'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_severity ON audit_logs(severity) WHERE severity IN ('warning', 'critical');

-- Comments
COMMENT ON TABLE audit_logs IS '시스템 감사 로그';
COMMENT ON COLUMN audit_logs.action IS '수행된 액션 (view, create, update, delete, export)';
COMMENT ON COLUMN audit_logs.changes IS '변경 사항 (field, oldValue, newValue)';
COMMENT ON COLUMN audit_logs.metadata IS '추가 정보 (userAgent, sessionId, requestDuration)';

-- ============================================================================
-- 9. Admin Roles (관리자 역할)
-- ============================================================================
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_system_role BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Admin Role Assignments (관리자 역할 할당)
CREATE TABLE IF NOT EXISTS admin_role_assignments (
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  assigned_by UUID REFERENCES users(id) ON DELETE SET NULL,
  PRIMARY KEY (user_id, role_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_admin_role_name ON admin_roles(name);
CREATE INDEX IF NOT EXISTS idx_admin_role_system ON admin_roles(is_system_role) WHERE is_system_role = TRUE;
CREATE INDEX IF NOT EXISTS idx_admin_role_assignments_user ON admin_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_role_assignments_role ON admin_role_assignments(role_id);

-- Comments
COMMENT ON TABLE admin_roles IS '관리자 역할 정의';
COMMENT ON COLUMN admin_roles.permissions IS '권한 배열 (resource, actions)';
COMMENT ON COLUMN admin_roles.is_system_role IS '시스템 기본 역할 여부 (수정/삭제 불가)';
COMMENT ON TABLE admin_role_assignments IS '사용자별 역할 할당';

-- ============================================================================
-- 10. Privacy Requests (개인정보 요청)
-- ============================================================================
CREATE TABLE IF NOT EXISTS privacy_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  request_type TEXT NOT NULL CHECK (request_type IN ('data_access', 'data_export', 'data_deletion', 'consent_withdrawal')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected')),
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  result_url TEXT -- 내보낸 데이터 URL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_privacy_company ON privacy_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_privacy_type ON privacy_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_privacy_status ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_requested_at ON privacy_requests(requested_at DESC);
CREATE INDEX IF NOT EXISTS idx_privacy_pending ON privacy_requests(status) WHERE status = 'pending';

-- Comments
COMMENT ON TABLE privacy_requests IS '개인정보 처리 요청 (GDPR, 개인정보보호법)';
COMMENT ON COLUMN privacy_requests.request_type IS '요청 유형 (data_access, data_export, data_deletion, consent_withdrawal)';

-- ============================================================================
-- 11. Announcements (공지사항)
-- ============================================================================
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  announcement_type TEXT NOT NULL CHECK (announcement_type IN ('info', 'feature', 'maintenance', 'urgent')),
  target JSONB NOT NULL DEFAULT '{"scope": "all"}'::jsonb,
  delivery JSONB NOT NULL DEFAULT '{"channels": ["dashboard"]}'::jsonb,
  visibility JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'archived')),
  stats JSONB DEFAULT '{"sent": 0, "viewed": 0}'::jsonb,
  created_by UUID NOT NULL REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  published_at TIMESTAMP WITH TIME ZONE,
  scheduled_at TIMESTAMP WITH TIME ZONE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_announcement_status ON announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcement_type ON announcements(announcement_type);
CREATE INDEX IF NOT EXISTS idx_announcement_published ON announcements(published_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_scheduled ON announcements(scheduled_at) WHERE status = 'scheduled';
CREATE INDEX IF NOT EXISTS idx_announcement_created_by ON announcements(created_by);

-- Comments
COMMENT ON TABLE announcements IS '시스템 공지사항';
COMMENT ON COLUMN announcements.target IS '대상 (scope: all|segment|specific, planTypes, companyIds, segments)';
COMMENT ON COLUMN announcements.delivery IS '전달 채널 (channels: dashboard|email|in_app, scheduleAt)';
COMMENT ON COLUMN announcements.visibility IS '표시 설정 (startDate, endDate, dismissible)';

-- ============================================================================
-- 12. In-App Messages (인앱 메시지)
-- ============================================================================
CREATE TABLE IF NOT EXISTS in_app_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  message_type TEXT NOT NULL CHECK (message_type IN ('banner', 'modal', 'toast', 'tooltip')),
  content JSONB NOT NULL,
  targeting JSONB DEFAULT '{}'::jsonb,
  display JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  priority INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_in_app_message_type ON in_app_messages(message_type);
CREATE INDEX IF NOT EXISTS idx_in_app_message_active ON in_app_messages(is_active, priority DESC) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_in_app_message_created_by ON in_app_messages(created_by);

-- Comments
COMMENT ON TABLE in_app_messages IS '인앱 메시지';
COMMENT ON COLUMN in_app_messages.content IS '메시지 내용 (title, message, cta)';
COMMENT ON COLUMN in_app_messages.targeting IS '타겟팅 (companyIds, conditions)';
COMMENT ON COLUMN in_app_messages.display IS '표시 설정 (position, frequency, priority)';
COMMENT ON COLUMN in_app_messages.schedule IS '스케줄 (startDate, endDate)';

-- ============================================================================
-- 13. Email Templates (이메일 템플릿)
-- ============================================================================
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  category TEXT CHECK (category IN ('onboarding', 'billing', 'engagement', 'support', 'marketing')),
  trigger JSONB DEFAULT '{}'::jsonb,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  text_body TEXT,
  variables TEXT[] DEFAULT ARRAY[]::TEXT[],
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  schedule JSONB DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  stats JSONB DEFAULT '{"sent": 0, "opened": 0, "clicked": 0, "bounced": 0}'::jsonb,
  created_by UUID REFERENCES users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_email_template_category ON email_templates(category);
CREATE INDEX IF NOT EXISTS idx_email_template_active ON email_templates(is_active) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_email_template_name ON email_templates(name);
CREATE INDEX IF NOT EXISTS idx_email_template_created_by ON email_templates(created_by);

-- Comments
COMMENT ON TABLE email_templates IS '이메일 템플릿';
COMMENT ON COLUMN email_templates.trigger IS '트리거 조건 (type: event|workflow|manual, event)';
COMMENT ON COLUMN email_templates.variables IS '템플릿 변수 배열 ({{company_name}}, {{user_name}} 등)';
COMMENT ON COLUMN email_templates.settings IS '발송 설정 (fromName, fromEmail, replyTo, cc, bcc)';
COMMENT ON COLUMN email_templates.schedule IS '스케줄 (delay, sendAt)';

-- ============================================================================
-- Functions and Triggers
-- ============================================================================

-- Updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_customer_health_scores_updated_at ON customer_health_scores;
CREATE TRIGGER update_customer_health_scores_updated_at BEFORE UPDATE ON customer_health_scores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_onboarding_progress_updated_at ON onboarding_progress;
CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON onboarding_progress
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_automation_workflows_updated_at ON automation_workflows;
CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON automation_workflows
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_admin_roles_updated_at ON admin_roles;
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_announcements_updated_at ON announcements;
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_in_app_messages_updated_at ON in_app_messages;
CREATE TRIGGER update_in_app_messages_updated_at BEFORE UPDATE ON in_app_messages
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_email_templates_updated_at ON email_templates;
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Seed Data: Default Admin Roles
-- ============================================================================

INSERT INTO admin_roles (id, name, description, permissions, is_system_role) VALUES
  (
    '00000000-0000-0000-0000-000000000001',
    'super_admin',
    '슈퍼 관리자 - 모든 권한',
    '[{"resource": "*", "actions": ["read", "create", "update", "delete", "export"]}]'::jsonb,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000002',
    'cs_manager',
    '고객 성공 매니저 - 고객사 관리 및 지원',
    '[
      {"resource": "companies", "actions": ["read", "update"]},
      {"resource": "users", "actions": ["read"]},
      {"resource": "support", "actions": ["read", "create", "update"]},
      {"resource": "health", "actions": ["read"]},
      {"resource": "onboarding", "actions": ["read", "update"]},
      {"resource": "announcements", "actions": ["read", "create", "update"]}
    ]'::jsonb,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000003',
    'finance',
    '재무 담당자 - 결제 및 수익 관리',
    '[
      {"resource": "subscriptions", "actions": ["read", "update"]},
      {"resource": "billing", "actions": ["read", "create", "update"]},
      {"resource": "revenue", "actions": ["read", "export"]},
      {"resource": "churn", "actions": ["read", "export"]}
    ]'::jsonb,
    TRUE
  ),
  (
    '00000000-0000-0000-0000-000000000004',
    'analyst',
    '데이터 분석가 - 읽기 및 내보내기만 가능',
    '[
      {"resource": "*", "actions": ["read", "export"]}
    ]'::jsonb,
    TRUE
  )
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- Grant Permissions
-- ============================================================================

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================================
-- Migration Complete
-- ============================================================================

COMMENT ON SCHEMA public IS 'Admin Enhancement Schema v1.0 - 13 new tables for customer success, revenue, automation, security, and communication';
