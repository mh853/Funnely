const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function updateSubscriptionPlans() {
  console.log('🚀 Updating subscription plans structure...\n')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables!')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Read SQL file
  const sqlPath = path.join(__dirname, '../supabase/migrations/20251221000000_update_subscription_plans_structure.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('📄 Executing migration...')

  // Execute SQL
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

  if (error) {
    console.error('❌ Migration failed:', error)

    // Try direct execution via SQL editor (fallback)
    console.log('\n⚠️  Please execute the migration manually:')
    console.log('1. Go to Supabase SQL Editor')
    console.log('2. Copy the contents of:', sqlPath)
    console.log('3. Execute the SQL')

    process.exit(1)
  }

  console.log('✅ Migration executed successfully!')

  // Verify new plans
  const { data: plans, error: plansError } = await supabase
    .from('subscription_plans')
    .select('user_type, tier, name, price_monthly, is_active')
    .eq('is_active', true)
    .order('user_type')
    .order('tier')

  if (plansError) {
    console.error('❌ Error fetching plans:', plansError)
  } else {
    console.log('\n📊 New subscription plans:')
    console.table(plans)
  }
}

updateSubscriptionPlans()
