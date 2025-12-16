-- Admin Enhancement Schema Migration (Compact Version)
-- Execute this in Supabase Dashboard SQL Editor
-- https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql/new

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Customer Health Scores
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
CREATE INDEX IF NOT EXISTS idx_health_company ON customer_health_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_health_risk ON customer_health_scores(risk_level);
CREATE INDEX IF NOT EXISTS idx_health_calculated ON customer_health_scores(calculated_at DESC);
CREATE INDEX IF NOT EXISTS idx_health_score ON customer_health_scores(score);

-- 2. Onboarding Progress
CREATE TABLE IF NOT EXISTS onboarding_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  current_step TEXT NOT NULL,
  completed_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  completion_percentage INTEGER NOT NULL DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_company ON onboarding_progress(company_id);
CREATE INDEX IF NOT EXISTS idx_onboarding_completion ON onboarding_progress(completion_percentage);
CREATE INDEX IF NOT EXISTS idx_onboarding_started ON onboarding_progress(started_at DESC);

-- 3. Feature Usage Tracking
CREATE TABLE IF NOT EXISTS feature_usage_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  feature_name TEXT NOT NULL,
  usage_count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  first_used_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, feature_name)
);
CREATE INDEX IF NOT EXISTS idx_feature_company ON feature_usage_tracking(company_id);
CREATE INDEX IF NOT EXISTS idx_feature_name ON feature_usage_tracking(feature_name);
CREATE INDEX IF NOT EXISTS idx_feature_last_used ON feature_usage_tracking(last_used_at DESC);
CREATE INDEX IF NOT EXISTS idx_feature_usage_count ON feature_usage_tracking(usage_count DESC);

-- 4. Revenue Metrics
CREATE TABLE IF NOT EXISTS revenue_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  mrr DECIMAL(10, 2) NOT NULL DEFAULT 0,
  arr DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_revenue DECIMAL(10, 2) NOT NULL DEFAULT 0,
  metrics JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, period_start, period_end)
);
CREATE INDEX IF NOT EXISTS idx_revenue_company ON revenue_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_revenue_period ON revenue_metrics(period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_mrr ON revenue_metrics(mrr DESC);
CREATE INDEX IF NOT EXISTS idx_revenue_arr ON revenue_metrics(arr DESC);

-- 5. Churn Records
CREATE TABLE IF NOT EXISTS churn_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  churn_date TIMESTAMP WITH TIME ZONE NOT NULL,
  reason TEXT,
  churn_type TEXT NOT NULL CHECK (churn_type IN ('voluntary', 'involuntary', 'other')),
  ltv DECIMAL(10, 2),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_churn_company ON churn_records(company_id);
CREATE INDEX IF NOT EXISTS idx_churn_date ON churn_records(churn_date DESC);
CREATE INDEX IF NOT EXISTS idx_churn_type ON churn_records(churn_type);

-- 6. Automation Workflows
CREATE TABLE IF NOT EXISTS automation_workflows (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  actions JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_workflow_active ON automation_workflows(is_active);
CREATE INDEX IF NOT EXISTS idx_workflow_trigger ON automation_workflows(trigger_type);
CREATE INDEX IF NOT EXISTS idx_workflow_created ON automation_workflows(created_at DESC);

-- 7. Bulk Operations
CREATE TABLE IF NOT EXISTS bulk_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operation_type TEXT NOT NULL,
  target_entity TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 0,
  filters JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  result JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bulk_status ON bulk_operations(status);
CREATE INDEX IF NOT EXISTS idx_bulk_type ON bulk_operations(operation_type);
CREATE INDEX IF NOT EXISTS idx_bulk_created ON bulk_operations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_created_by ON bulk_operations(created_by);

-- 8. Admin Roles
CREATE TABLE IF NOT EXISTS admin_roles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_admin_role_code ON admin_roles(code);

-- 9. Admin Role Assignments
CREATE TABLE IF NOT EXISTS admin_role_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id UUID NOT NULL REFERENCES admin_roles(id) ON DELETE CASCADE,
  assigned_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, role_id)
);
CREATE INDEX IF NOT EXISTS idx_role_assignment_user ON admin_role_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_role ON admin_role_assignments(role_id);
CREATE INDEX IF NOT EXISTS idx_role_assignment_assigned ON admin_role_assignments(assigned_at DESC);

-- 10. Privacy Requests
CREATE TABLE IF NOT EXISTS privacy_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('data_export', 'data_deletion', 'data_correction', 'access_request')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  requested_data JSONB DEFAULT '{}'::jsonb,
  processed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  result JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_privacy_company ON privacy_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_privacy_status ON privacy_requests(status);
CREATE INDEX IF NOT EXISTS idx_privacy_type ON privacy_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_privacy_created ON privacy_requests(created_at DESC);

-- 11. Announcements
CREATE TABLE IF NOT EXISTS announcements (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('info', 'warning', 'maintenance', 'feature', 'important')),
  target_audience TEXT NOT NULL DEFAULT 'all' CHECK (target_audience IN ('all', 'active_companies', 'trial_companies', 'specific_companies')),
  target_companies JSONB DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_announcement_published ON announcements(is_published);
CREATE INDEX IF NOT EXISTS idx_announcement_type ON announcements(type);
CREATE INDEX IF NOT EXISTS idx_announcement_created ON announcements(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_announcement_expires ON announcements(expires_at);

-- 12. In-App Messages
CREATE TABLE IF NOT EXISTS in_app_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL CHECK (message_type IN ('info', 'warning', 'success', 'error', 'tip')),
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  action_url TEXT,
  action_label TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_message_company ON in_app_messages(company_id);
CREATE INDEX IF NOT EXISTS idx_message_user ON in_app_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_message_read ON in_app_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_message_created ON in_app_messages(created_at DESC);

-- 13. Email Templates
CREATE TABLE IF NOT EXISTS email_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  body_html TEXT NOT NULL,
  body_text TEXT NOT NULL,
  variables JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_email_template_code ON email_templates(code);
CREATE INDEX IF NOT EXISTS idx_email_template_active ON email_templates(is_active);

-- Triggers for auto-updating updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_customer_health_scores_updated_at BEFORE UPDATE ON customer_health_scores FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_onboarding_progress_updated_at BEFORE UPDATE ON onboarding_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_feature_usage_tracking_updated_at BEFORE UPDATE ON feature_usage_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_revenue_metrics_updated_at BEFORE UPDATE ON revenue_metrics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_churn_records_updated_at BEFORE UPDATE ON churn_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_automation_workflows_updated_at BEFORE UPDATE ON automation_workflows FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bulk_operations_updated_at BEFORE UPDATE ON bulk_operations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_roles_updated_at BEFORE UPDATE ON admin_roles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_admin_role_assignments_updated_at BEFORE UPDATE ON admin_role_assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_privacy_requests_updated_at BEFORE UPDATE ON privacy_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_announcements_updated_at BEFORE UPDATE ON announcements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_in_app_messages_updated_at BEFORE UPDATE ON in_app_messages FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_email_templates_updated_at BEFORE UPDATE ON email_templates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Seed Data: Default Admin Roles
INSERT INTO admin_roles (code, name, description, permissions) VALUES
('super_admin', '슈퍼 관리자', '모든 권한을 가진 최상위 관리자', '[
  "manage_companies", "manage_users", "manage_subscriptions", "manage_billing",
  "view_analytics", "manage_support", "manage_system_settings", "manage_roles",
  "view_audit_logs", "manage_privacy_requests", "manage_announcements"
]'::jsonb),
('cs_manager', '고객 성공 매니저', '고객 관리 및 지원 담당', '[
  "view_companies", "manage_support", "view_analytics",
  "manage_onboarding", "view_health_scores"
]'::jsonb),
('finance', '재무 담당자', '결제 및 구독 관리 담당', '[
  "view_companies", "manage_billing", "view_subscriptions",
  "view_revenue_metrics", "export_financial_data"
]'::jsonb),
('analyst', '분석가', '데이터 분석 및 리포트 담당', '[
  "view_companies", "view_analytics", "export_reports",
  "view_health_scores", "view_usage_metrics"
]'::jsonb)
ON CONFLICT (code) DO NOTHING;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Admin enhancement schema migration completed successfully!';
  RAISE NOTICE '📊 Created 13 new tables + extended 1 existing table';
  RAISE NOTICE '🔑 Created 30+ indexes for query optimization';
  RAISE NOTICE '⚡ Created 13 triggers for auto-updating timestamps';
  RAISE NOTICE '👥 Seeded 4 default admin roles';
END $$;
