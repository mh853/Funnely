-- Create materialized view for admin company statistics
-- Provides fast aggregated stats for all companies

CREATE MATERIALIZED VIEW IF NOT EXISTS admin_company_stats AS
SELECT
  c.id as company_id,
  c.name as company_name,
  c.created_at as joined_at,

  -- Company is considered active if it has any active users
  BOOL_OR(u.is_active) as is_active,

  -- User statistics
  COUNT(DISTINCT u.id) as total_users,
  COUNT(DISTINCT CASE WHEN u.is_active = true THEN u.id END) as active_users,
  COUNT(DISTINCT CASE WHEN u.last_login > NOW() - INTERVAL '30 days' THEN u.id END) as active_users_30d,

  -- Lead statistics
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.created_at > NOW() - INTERVAL '30 days' THEN l.id END) as leads_30d,
  COUNT(DISTINCT CASE WHEN l.created_at > NOW() - INTERVAL '7 days' THEN l.id END) as leads_7d,

  -- Landing page statistics
  COUNT(DISTINCT lp.id) as total_landing_pages,
  COUNT(DISTINCT CASE WHEN lp.status = 'published' THEN lp.id END) as published_landing_pages,
  COALESCE(SUM(lp.views_count), 0) as total_page_views,
  COALESCE(SUM(lp.submissions_count), 0) as total_submissions,

  -- Conversion rate
  CASE
    WHEN COALESCE(SUM(lp.views_count), 0) > 0
    THEN ROUND((COALESCE(SUM(lp.submissions_count), 0)::NUMERIC / COALESCE(SUM(lp.views_count), 0)::NUMERIC * 100), 2)
    ELSE 0
  END as conversion_rate,

  -- Support ticket statistics
  COUNT(DISTINCT st.id) FILTER (WHERE st.status != 'closed') as open_tickets,
  COUNT(DISTINCT st.id) FILTER (WHERE st.status = 'open') as new_tickets,
  COUNT(DISTINCT st.id) FILTER (WHERE st.priority = 'urgent' AND st.status != 'closed') as urgent_tickets,

  -- Last activity
  MAX(u.last_login) as last_user_activity,
  MAX(l.created_at) as last_lead_created,

  -- Stats update timestamp
  NOW() as stats_updated_at

FROM companies c
LEFT JOIN users u ON u.company_id = c.id
LEFT JOIN leads l ON l.company_id = c.id
LEFT JOIN landing_pages lp ON lp.company_id = c.id
LEFT JOIN support_tickets st ON st.company_id = c.id
GROUP BY c.id, c.name, c.created_at;

-- Create unique index on company_id for CONCURRENTLY refresh
CREATE UNIQUE INDEX IF NOT EXISTS idx_admin_company_stats_company
  ON admin_company_stats(company_id);

-- Create additional indexes for common queries
CREATE INDEX IF NOT EXISTS idx_admin_company_stats_active
  ON admin_company_stats(is_active, stats_updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_company_stats_joined
  ON admin_company_stats(joined_at DESC);

CREATE INDEX IF NOT EXISTS idx_admin_company_stats_leads_30d
  ON admin_company_stats(leads_30d DESC NULLS LAST);

-- Add comments
COMMENT ON MATERIALIZED VIEW admin_company_stats IS 'Aggregated statistics for all companies (for admin dashboard)';
COMMENT ON COLUMN admin_company_stats.active_users_30d IS 'Users who signed in within last 30 days';
COMMENT ON COLUMN admin_company_stats.conversion_rate IS 'Overall conversion rate across all landing pages (%)';

-- Note: Manual refresh with REFRESH MATERIALIZED VIEW CONCURRENTLY admin_company_stats;
-- For automatic refresh, consider using pg_cron extension:
-- SELECT cron.schedule('refresh-admin-stats', '0 * * * *', 'REFRESH MATERIALIZED VIEW CONCURRENTLY admin_company_stats');
