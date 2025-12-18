#!/usr/bin/env node

/**
 * Create test subscriptions for admin panel
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestSubscriptions() {
  console.log('🔍 Creating test subscriptions...\n')

  // Get companies
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .limit(3)

  if (!companies || companies.length === 0) {
    console.error('❌ No companies found. Please create companies first.')
    return
  }

  // Get plans
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name')

  if (!plans || plans.length === 0) {
    console.error('❌ No subscription plans found.')
    return
  }

  console.log(`✅ Found ${companies.length} companies and ${plans.length} plans\n`)

  // Create subscriptions for each company
  const testSubscriptions = companies.map((company, index) => {
    const plan = plans[index % plans.length] // Rotate through plans
    const now = new Date()
    const periodStart = new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000) // 15 days ago
    const periodEnd = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000) // 15 days from now

    const statuses = ['active', 'trial', 'active']
    const billingCycles = ['monthly', 'yearly', 'monthly']

    return {
      company_id: company.id,
      plan_id: plan.id,
      status: statuses[index % statuses.length],
      billing_cycle: billingCycles[index % billingCycles.length],
      current_period_start: periodStart.toISOString(),
      current_period_end: periodEnd.toISOString(),
      trial_end: index === 1 ? periodEnd.toISOString() : null, // Only trial has trial_end
      cancelled_at: null,
    }
  })

  const { data, error } = await supabase
    .from('company_subscriptions')
    .insert(testSubscriptions)
    .select()

  if (error) {
    console.error('❌ Error creating subscriptions:', error)
    return
  }

  console.log(`✅ Created ${data.length} test subscriptions\n`)

  // Show summary
  data.forEach((sub, idx) => {
    console.log(`${idx + 1}. ${sub.status.toUpperCase()} - ${sub.billing_cycle}`)
    console.log(`   Period: ${new Date(sub.current_period_start).toLocaleDateString('ko-KR')} ~ ${new Date(sub.current_period_end).toLocaleDateString('ko-KR')}`)
  })

  console.log()

  const { count: activeCount } = await supabase
    .from('company_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'active')

  const { count: trialCount } = await supabase
    .from('company_subscriptions')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'trial')

  console.log(`📊 Summary:`)
  console.log(`   Active subscriptions: ${activeCount}`)
  console.log(`   Trial subscriptions: ${trialCount}`)
}

createTestSubscriptions().catch(console.error)
