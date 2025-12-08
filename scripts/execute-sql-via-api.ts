import * as dotenv from 'dotenv'
import { createClient } from '@supabase/supabase-js'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function executeMigration() {
  console.log('Executing lead_statuses migration...')

  // Step 1: Create the table
  console.log('\nStep 1: Creating lead_statuses table...')
  const { error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
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
    `
  })

  if (tableError) {
    console.log('Could not use RPC, will insert data directly')
  }

  // Step 2: Get all companies
  console.log('\nStep 2: Getting all companies...')
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id')

  if (companiesError) {
    console.error('Error fetching companies:', companiesError)
    return
  }

  console.log(`Found ${companies?.length || 0} companies`)

  // Step 3: Insert default statuses for each company
  const defaultStatuses = [
    { code: 'new', label: '상담 전', color: 'orange', sort_order: 1, is_default: true },
    { code: 'rejected', label: '상담 거절', color: 'red', sort_order: 2, is_default: false },
    { code: 'contacted', label: '상담 진행중', color: 'sky', sort_order: 3, is_default: false },
    { code: 'converted', label: '상담 완료', color: 'green', sort_order: 4, is_default: false },
    { code: 'contract_completed', label: '예약 확정', color: 'emerald', sort_order: 5, is_default: false },
    { code: 'needs_followup', label: '추가상담 필요', color: 'yellow', sort_order: 6, is_default: false },
    { code: 'other', label: '기타', color: 'gray', sort_order: 7, is_default: false },
  ]

  console.log('\nStep 3: Inserting default statuses for each company...')
  for (const company of companies || []) {
    console.log(`  Company ${company.id}...`)

    for (const status of defaultStatuses) {
      const { error } = await supabase
        .from('lead_statuses')
        .upsert({
          company_id: company.id,
          ...status,
        }, {
          onConflict: 'company_id,code',
        })

      if (error) {
        if (error.code === '42P01') {
          console.error('❌ Table does not exist. Please create it in Supabase Dashboard first.')
          console.log('\nGo to: https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql/new')
          console.log('And run the SQL from: supabase/migrations/20250220000000_create_lead_statuses.sql')
          return
        }
        console.error(`    Error inserting ${status.code}:`, error.message)
      }
    }
  }

  console.log('\n✅ Migration completed successfully!')

  // Verify
  const { data: statuses, error: verifyError } = await supabase
    .from('lead_statuses')
    .select('*')
    .limit(10)

  if (!verifyError && statuses) {
    console.log(`\nVerification: ${statuses.length} statuses found in database`)
  }
}

executeMigration().catch(console.error)
