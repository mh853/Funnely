-- Create support ticket system for customer support management
-- Enables companies to submit tickets and admins to respond

-- Main support tickets table
CREATE TABLE IF NOT EXISTS support_tickets (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  assigned_admin_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Ticket information
  subject VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  category VARCHAR(50), -- 'billing', 'technical', 'feature_request', 'bug', 'general'

  -- Metadata
  attachments JSONB DEFAULT '[]'::jsonb, -- Array of attachment URLs
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ
);

-- Ticket messages/replies table
CREATE TABLE IF NOT EXISTS support_ticket_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Message information
  message TEXT NOT NULL,
  is_internal_note BOOLEAN DEFAULT false, -- Internal notes only visible to admins
  attachments JSONB DEFAULT '[]'::jsonb,

  -- Timestamp
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ticket status change history table
CREATE TABLE IF NOT EXISTS support_ticket_status_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  ticket_id UUID NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  changed_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  -- Change information
  old_status VARCHAR(20),
  new_status VARCHAR(20) NOT NULL,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_support_tickets_company ON support_tickets(company_id, created_at DESC);
CREATE INDEX idx_support_tickets_status ON support_tickets(status, priority, created_at DESC);
CREATE INDEX idx_support_tickets_assigned ON support_tickets(assigned_admin_id, status) WHERE assigned_admin_id IS NOT NULL;
CREATE INDEX idx_support_tickets_category ON support_tickets(category, created_at DESC) WHERE category IS NOT NULL;

CREATE INDEX idx_ticket_messages_ticket ON support_ticket_messages(ticket_id, created_at);
CREATE INDEX idx_ticket_messages_internal ON support_ticket_messages(ticket_id, is_internal_note, created_at);

CREATE INDEX idx_ticket_status_history_ticket ON support_ticket_status_history(ticket_id, created_at);

-- Add comments
COMMENT ON TABLE support_tickets IS 'Customer support tickets submitted by companies';
COMMENT ON COLUMN support_tickets.status IS 'Ticket status: open, in_progress, resolved, closed';
COMMENT ON COLUMN support_tickets.priority IS 'Ticket priority: low, medium, high, urgent';
COMMENT ON COLUMN support_tickets.category IS 'Ticket category for classification';

COMMENT ON TABLE support_ticket_messages IS 'Messages/replies for support tickets';
COMMENT ON COLUMN support_ticket_messages.is_internal_note IS 'Internal admin notes (not visible to customers)';

COMMENT ON TABLE support_ticket_status_history IS 'Audit trail for ticket status changes';

-- Enable RLS
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_ticket_status_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies for support_tickets
-- Super admins can view/edit all tickets
CREATE POLICY "Super admins can manage all support tickets"
  ON support_tickets
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Users can view their company's tickets
CREATE POLICY "Users can view their company tickets"
  ON support_tickets
  FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- Users can create tickets for their company
CREATE POLICY "Users can create tickets for their company"
  ON support_tickets
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  );

-- RLS Policies for support_ticket_messages
-- Super admins can view all messages
CREATE POLICY "Super admins can view all ticket messages"
  ON support_ticket_messages
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Users can view non-internal messages for their company's tickets
CREATE POLICY "Users can view their company ticket messages"
  ON support_ticket_messages
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT st.id FROM support_tickets st
      INNER JOIN users u ON u.company_id = st.company_id
      WHERE u.id = auth.uid()
    )
    AND is_internal_note = false
  );

-- Anyone (authenticated) can insert messages
CREATE POLICY "Authenticated users can create ticket messages"
  ON support_ticket_messages
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- RLS Policies for support_ticket_status_history
-- Super admins can view all status history
CREATE POLICY "Super admins can view all status history"
  ON support_ticket_status_history
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND users.is_super_admin = true
    )
  );

-- Users can view status history for their company's tickets
CREATE POLICY "Users can view their company ticket status history"
  ON support_ticket_status_history
  FOR SELECT
  TO authenticated
  USING (
    ticket_id IN (
      SELECT st.id FROM support_tickets st
      INNER JOIN users u ON u.company_id = st.company_id
      WHERE u.id = auth.uid()
    )
  );

-- System can insert status history
CREATE POLICY "System can insert status history"
  ON support_ticket_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
