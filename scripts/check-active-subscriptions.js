const { createClient } = require('@supabase/supabase-js')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function checkActiveSubscriptions() {
  console.log('🔍 Checking active subscriptions and their plans...\n')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables!')
    process.exit(1)
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // 1. 활성 구독 조회
  const { data: subscriptions, error } = await supabase
    .from('company_subscriptions')
    .select(`
      id,
      status,
      billing_cycle,
      subscription_plans:plan_id (
        id,
        name,
        plan_type,
        tier,
        user_type,
        price_monthly,
        price_yearly
      )
    `)
    .eq('status', 'active')
    .limit(10)

  if (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }

  console.log('📊 Active subscriptions:')
  subscriptions.forEach((sub, index) => {
    const plan = sub.subscription_plans
    console.log(`\n${index + 1}. Subscription ID: ${sub.id}`)
    console.log(`   Plan Name: ${plan.name}`)
    console.log(`   Plan Type: ${plan.plan_type}`)
    console.log(`   Tier: ${plan.tier || 'N/A'}`)
    console.log(`   User Type: ${plan.user_type || 'N/A'}`)
    console.log(`   Price: ₩${plan.price_monthly}/month`)
  })

  // 2. 모든 활성 플랜 조회
  const { data: plans, error: plansError } = await supabase
    .from('subscription_plans')
    .select('name, plan_type, tier, user_type, price_monthly, is_active')
    .eq('is_active', true)

  if (!plansError && plans) {
    console.log('\n\n📋 All active plans in database:')
    console.table(plans)
  }
}

checkActiveSubscriptions()
