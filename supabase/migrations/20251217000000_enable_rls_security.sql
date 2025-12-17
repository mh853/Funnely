-- Enable RLS (Row Level Security) for all admin and system tables
-- Migration: 20251217000000_enable_rls_security.sql
-- Purpose: Fix security vulnerabilities by enabling RLS on public tables

-- ============================================================
-- 1. Enable RLS on users table (CRITICAL - has policies but RLS disabled)
-- ============================================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Enable RLS on admin system tables (Phase 1.1)
-- ============================================================

-- Admin roles and permissions
ALTER TABLE public.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_role_assignments ENABLE ROW LEVEL SECURITY;

-- Privacy and compliance
ALTER TABLE public.privacy_requests ENABLE ROW LEVEL SECURITY;

-- Communication
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.in_app_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

-- Automation and operations
ALTER TABLE public.automation_workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bulk_operations ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. Enable RLS on customer success tables (Phase 2)
-- ============================================================

-- Health scores
ALTER TABLE public.customer_health_scores ENABLE ROW LEVEL SECURITY;

-- Onboarding
ALTER TABLE public.onboarding_progress ENABLE ROW LEVEL SECURITY;

-- Feature usage
ALTER TABLE public.feature_usage_tracking ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 4. Enable RLS on financial tables (Phase 3)
-- ============================================================

-- Revenue metrics
ALTER TABLE public.revenue_metrics ENABLE ROW LEVEL SECURITY;

-- Churn tracking
ALTER TABLE public.churn_records ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 5. Create RLS policies for admin tables
-- ============================================================

-- Policy: Only super admins can access admin_roles
CREATE POLICY "Super admins can manage admin roles"
  ON public.admin_roles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments ara
      JOIN public.admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid()
      AND ar.code = 'super_admin'
    )
  );

-- Policy: Only super admins can access admin_role_assignments
CREATE POLICY "Super admins can manage role assignments"
  ON public.admin_role_assignments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments ara
      JOIN public.admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid()
      AND ar.code = 'super_admin'
    )
  );

-- Policy: Admins with appropriate permissions can view health scores
CREATE POLICY "Admins can view customer health scores"
  ON public.customer_health_scores
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can view onboarding progress
CREATE POLICY "Admins can view onboarding progress"
  ON public.onboarding_progress
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can view feature usage
CREATE POLICY "Admins can view feature usage"
  ON public.feature_usage_tracking
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Finance role can view revenue metrics
CREATE POLICY "Finance and admins can view revenue"
  ON public.revenue_metrics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments ara
      JOIN public.admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid()
      AND ar.code IN ('super_admin', 'finance', 'analyst')
    )
  );

-- Policy: Finance role can view churn records
CREATE POLICY "Finance and admins can view churn"
  ON public.churn_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments ara
      JOIN public.admin_roles ar ON ara.role_id = ar.id
      WHERE ara.user_id = auth.uid()
      AND ar.code IN ('super_admin', 'finance', 'analyst')
    )
  );

-- Policy: Admins can manage privacy requests
CREATE POLICY "Admins can manage privacy requests"
  ON public.privacy_requests
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can manage announcements
CREATE POLICY "Admins can manage announcements"
  ON public.announcements
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can manage in-app messages
CREATE POLICY "Admins can manage in-app messages"
  ON public.in_app_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can manage email templates
CREATE POLICY "Admins can manage email templates"
  ON public.email_templates
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can manage automation workflows
CREATE POLICY "Admins can manage workflows"
  ON public.automation_workflows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );

-- Policy: Admins can view bulk operations
CREATE POLICY "Admins can view bulk operations"
  ON public.bulk_operations
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admin_role_assignments
      WHERE user_id = auth.uid()
    )
  );

-- ============================================================
-- 6. Verification
-- ============================================================

DO $$
DECLARE
  rls_enabled_count INTEGER;
  total_tables INTEGER := 15;
BEGIN
  -- Count tables with RLS enabled
  SELECT COUNT(*)
  INTO rls_enabled_count
  FROM pg_tables
  WHERE schemaname = 'public'
  AND tablename IN (
    'users',
    'admin_roles',
    'admin_role_assignments',
    'privacy_requests',
    'announcements',
    'in_app_messages',
    'email_templates',
    'automation_workflows',
    'bulk_operations',
    'customer_health_scores',
    'onboarding_progress',
    'feature_usage_tracking',
    'revenue_metrics',
    'churn_records'
  )
  AND rowsecurity = true;

  RAISE NOTICE '✅ RLS Security Migration Completed';
  RAISE NOTICE '📊 RLS enabled on % out of % tables', rls_enabled_count, total_tables;

  IF rls_enabled_count = total_tables THEN
    RAISE NOTICE '🎉 All security vulnerabilities resolved!';
  ELSE
    RAISE WARNING '⚠️ Some tables still missing RLS: % remaining', total_tables - rls_enabled_count;
  END IF;
END $$;
