#!/usr/bin/env node

/**
 * Check subscription data in database
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkSubscriptionsData() {
  console.log('🔍 Checking subscriptions data...\n')

  // Total subscriptions
  const { count: totalCount } = await supabase
    .from('company_subscriptions')
    .select('*', { count: 'exact', head: true })

  console.log(`📊 Total subscriptions: ${totalCount || 0}`)

  // Count by status
  const { data: statusCounts } = await supabase
    .from('company_subscriptions')
    .select('status')

  const statusMap = {}
  statusCounts?.forEach(s => {
    statusMap[s.status] = (statusMap[s.status] || 0) + 1
  })

  console.log('📈 By status:')
  Object.entries(statusMap).forEach(([status, count]) => {
    console.log(`   ${status}: ${count}`)
  })

  // Sample subscriptions
  const { data: subscriptions } = await supabase
    .from('company_subscriptions')
    .select(`
      id,
      status,
      billing_cycle,
      current_period_start,
      current_period_end,
      trial_end,
      created_at,
      companies!inner(name),
      subscription_plans!inner(name, price_monthly, price_yearly)
    `)
    .order('created_at', { ascending: false })
    .limit(5)

  console.log('\n📋 Sample subscriptions (latest 5):\n')

  subscriptions?.forEach((sub, idx) => {
    console.log(`${idx + 1}. ${sub.companies.name}`)
    console.log(`   Plan: ${sub.subscription_plans.name}`)
    console.log(`   Status: ${sub.status}`)
    console.log(`   Billing: ${sub.billing_cycle}`)
    console.log(`   Period: ${new Date(sub.current_period_start).toLocaleDateString('ko-KR')} ~ ${new Date(sub.current_period_end).toLocaleDateString('ko-KR')}`)
    if (sub.trial_end) {
      console.log(`   Trial End: ${new Date(sub.trial_end).toLocaleDateString('ko-KR')}`)
    }
    console.log()
  })
}

checkSubscriptionsData().catch(console.error)
