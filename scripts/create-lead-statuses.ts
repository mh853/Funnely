import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function createLeadStatusesTable() {
  console.log('Creating lead_statuses table...')

  // Create table using raw SQL via rpc or direct query
  // Since we can't execute raw SQL easily, we'll check if table exists first
  const { data: existing, error: checkError } = await supabase
    .from('lead_statuses')
    .select('id')
    .limit(1)

  if (!checkError) {
    console.log('Table already exists, inserting default statuses for all companies...')
  } else {
    console.log('Table does not exist. Please run the migration manually in Supabase dashboard.')
    console.log('Migration file: supabase/migrations/20250220000000_create_lead_statuses.sql')
    return
  }

  // Get all companies
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id')

  if (companiesError) {
    console.error('Error fetching companies:', companiesError)
    return
  }

  console.log(`Found ${companies?.length || 0} companies`)

  const defaultStatuses = [
    { code: 'new', label: '상담 전', color: 'orange', sort_order: 1, is_default: true },
    { code: 'rejected', label: '상담 거절', color: 'red', sort_order: 2, is_default: false },
    { code: 'contacted', label: '상담 진행중', color: 'sky', sort_order: 3, is_default: false },
    { code: 'converted', label: '상담 완료', color: 'green', sort_order: 4, is_default: false },
    { code: 'contract_completed', label: '예약 확정', color: 'emerald', sort_order: 5, is_default: false },
    { code: 'needs_followup', label: '추가상담 필요', color: 'yellow', sort_order: 6, is_default: false },
    { code: 'other', label: '기타', color: 'gray', sort_order: 7, is_default: false },
  ]

  for (const company of companies || []) {
    console.log(`Inserting default statuses for company ${company.id}...`)

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
        console.error(`Error inserting status ${status.code}:`, error)
      }
    }
  }

  console.log('Done!')
}

createLeadStatusesTable().catch(console.error)
