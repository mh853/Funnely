const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function checkSubscriptionPlansSchema() {
  console.log('🔍 Checking subscription_plans table schema...\n')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables!')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. 현재 플랜 데이터 조회
  const { data: plans, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .limit(5)

  if (error) {
    console.error('❌ Error fetching plans:', error)
    process.exit(1)
  }

  console.log('📊 Current subscription_plans data:')
  console.log(JSON.stringify(plans, null, 2))

  if (plans && plans.length > 0) {
    console.log('\n📋 Columns found:')
    Object.keys(plans[0]).forEach(col => console.log(`  - ${col}`))

    const hasUserType = 'user_type' in plans[0]
    const hasTier = 'tier' in plans[0]

    console.log(`\n✅ Has 'user_type' column: ${hasUserType}`)
    console.log(`✅ Has 'tier' column: ${hasTier}`)

    if (!hasUserType || !hasTier) {
      console.log('\n⚠️  Missing columns! Migration needed.')
    } else {
      console.log('\n✅ Schema is ready for new plan structure!')
    }
  }
}

checkSubscriptionPlansSchema()
