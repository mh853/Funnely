-- Phase 4.2: Bulk Operations Tool
-- Creates tables for bulk operation logging and tracking

-- ============================================================================
-- Bulk Operation Logs Table
-- ============================================================================

CREATE TABLE IF NOT EXISTS bulk_operation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('lead', 'company', 'subscription')),
  operation TEXT NOT NULL,
  entity_ids UUID[] NOT NULL,
  parameters JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  total_count INTEGER NOT NULL,
  success_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  error_details JSONB DEFAULT '[]'::jsonb,
  executed_by UUID REFERENCES users(id) ON DELETE SET NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for bulk_operation_logs
CREATE INDEX IF NOT EXISTS idx_bulk_operation_entity_type ON bulk_operation_logs(entity_type);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_status ON bulk_operation_logs(status);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_executed_by ON bulk_operation_logs(executed_by);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_started_at ON bulk_operation_logs(started_at DESC);
CREATE INDEX IF NOT EXISTS idx_bulk_operation_created_at ON bulk_operation_logs(created_at DESC);

-- Comments
COMMENT ON TABLE bulk_operation_logs IS 'Logs of bulk operations performed by admins';
COMMENT ON COLUMN bulk_operation_logs.entity_type IS 'Type of entity affected (lead, company, subscription)';
COMMENT ON COLUMN bulk_operation_logs.operation IS 'Operation performed (e.g., change_status, add_tags, delete)';
COMMENT ON COLUMN bulk_operation_logs.entity_ids IS 'Array of entity IDs affected by the operation';
COMMENT ON COLUMN bulk_operation_logs.parameters IS 'Operation-specific parameters (e.g., {status: "contacted", assignee_id: "..."})';
COMMENT ON COLUMN bulk_operation_logs.error_details IS 'Array of error objects for failed items: [{entity_id, error_message}]';
COMMENT ON COLUMN bulk_operation_logs.total_count IS 'Total number of entities to process';
COMMENT ON COLUMN bulk_operation_logs.success_count IS 'Number of successfully processed entities';
COMMENT ON COLUMN bulk_operation_logs.failed_count IS 'Number of failed entities';
