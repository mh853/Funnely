import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function runMigration() {
  console.log('Starting lead_statuses migration...')

  // Step 1: Check if table exists
  const { data: existingTable } = await supabase
    .from('lead_statuses')
    .select('id')
    .limit(1)

  if (existingTable !== null) {
    console.log('✅ lead_statuses table already exists')

    // Check if we have data
    const { data: statusCount, error: countError } = await supabase
      .from('lead_statuses')
      .select('id', { count: 'exact', head: true })

    if (!countError) {
      console.log(`   Table has data`)
    }
    return
  }

  console.log('❌ lead_statuses table does not exist')
  console.log('')
  console.log('Please run the following SQL in Supabase Dashboard:')
  console.log('https://supabase.com/dashboard/project/YOUR_PROJECT/sql/new')
  console.log('')
  console.log('Copy the contents of: supabase/migrations/20250220000000_create_lead_statuses.sql')
  console.log('')
  console.log('Or run this single command in SQL Editor:')
  console.log('='.repeat(80))

  const migrationSQL = `
-- Create lead_statuses table
CREATE TABLE IF NOT EXISTS lead_statuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  label VARCHAR(100) NOT NULL,
  color VARCHAR(20) NOT NULL DEFAULT 'gray',
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, code)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_lead_statuses_company_id ON lead_statuses(company_id);
CREATE INDEX IF NOT EXISTS idx_lead_statuses_sort_order ON lead_statuses(company_id, sort_order);

-- Enable RLS
ALTER TABLE lead_statuses ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own company statuses"
  ON lead_statuses FOR SELECT
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "Admins can insert statuses"
  ON lead_statuses FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND simple_role = 'admin'));

CREATE POLICY "Admins can update statuses"
  ON lead_statuses FOR UPDATE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND simple_role = 'admin'));

CREATE POLICY "Admins can delete statuses"
  ON lead_statuses FOR DELETE
  USING (company_id IN (SELECT company_id FROM users WHERE id = auth.uid() AND simple_role = 'admin'));

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_lead_statuses_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_lead_statuses_updated_at
  BEFORE UPDATE ON lead_statuses
  FOR EACH ROW
  EXECUTE FUNCTION update_lead_statuses_updated_at();

-- Insert default statuses for all existing companies
DO $$
DECLARE
  company_record RECORD;
BEGIN
  FOR company_record IN SELECT id FROM companies LOOP
    INSERT INTO lead_statuses (company_id, code, label, color, sort_order, is_default)
    VALUES
      (company_record.id, 'new', '상담 전', 'orange', 1, true),
      (company_record.id, 'rejected', '상담 거절', 'red', 2, false),
      (company_record.id, 'contacted', '상담 진행중', 'sky', 3, false),
      (company_record.id, 'converted', '상담 완료', 'green', 4, false),
      (company_record.id, 'contract_completed', '예약 확정', 'emerald', 5, false),
      (company_record.id, 'needs_followup', '추가상담 필요', 'yellow', 6, false),
      (company_record.id, 'other', '기타', 'gray', 7, false)
    ON CONFLICT (company_id, code) DO NOTHING;
  END LOOP;
END $$;
`

  console.log(migrationSQL)
  console.log('='.repeat(80))
}

runMigration().catch(console.error)
