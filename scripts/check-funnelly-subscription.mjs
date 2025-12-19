#!/usr/bin/env node

/**
 * Check Funnelly (퍼널리) subscription details and recent changes
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkFunnellySubscription() {
  console.log('🔍 Checking Funnelly (퍼널리) Subscription\n')

  // Find Funnelly company
  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .ilike('name', '%퍼널리%')
    .single()

  if (companyError || !company) {
    console.log('❌ Company not found')
    console.log('   Looking for companies with similar names...\n')

    const { data: allCompanies } = await supabase
      .from('companies')
      .select('id, name')
      .order('created_at', { ascending: false })
      .limit(10)

    console.log('Recent companies:')
    allCompanies?.forEach((c, i) => {
      console.log(`${i + 1}. ${c.name} (${c.id})`)
    })
    return
  }

  console.log('✅ Company Found:')
  console.log(`   Name: ${company.name}`)
  console.log(`   ID: ${company.id}\n`)

  // Get subscription
  const { data: sub, error: subError } = await supabase
    .from('company_subscriptions')
    .select(`
      id,
      status,
      billing_cycle,
      created_at,
      updated_at,
      subscription_plans (id, name)
    `)
    .eq('company_id', company.id)
    .single()

  if (subError || !sub) {
    console.log('❌ No subscription found for this company\n')
    return
  }

  console.log('📋 Subscription Details:')
  console.log(`   Subscription ID: ${sub.id}`)
  console.log(`   Plan: ${sub.subscription_plans.name}`)
  console.log(`   Plan ID: ${sub.subscription_plans.id}`)
  console.log(`   Status: ${sub.status}`)
  console.log(`   Billing Cycle: ${sub.billing_cycle}`)
  console.log(`   Created: ${new Date(sub.created_at).toLocaleString('ko-KR')}`)
  console.log(`   Updated: ${new Date(sub.updated_at).toLocaleString('ko-KR')}\n`)

  // Check if there are any notifications for this company
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('company_id', company.id)
    .order('created_at', { ascending: false })

  if (notifError) {
    console.log('❌ Error fetching notifications:', notifError.message)
    return
  }

  console.log(`📧 Notifications for ${company.name}:`)
  if (!notifications || notifications.length === 0) {
    console.log('   ⚠️  No notifications found\n')
  } else {
    console.log(`   Total: ${notifications.length}\n`)
    notifications.forEach((n, i) => {
      console.log(`   ${i + 1}. [${n.type}] ${n.title}`)
      console.log(`      Message: ${n.message}`)
      console.log(`      Created: ${new Date(n.created_at).toLocaleString('ko-KR')}`)
      console.log('')
    })
  }

  // Diagnosis
  console.log('🔬 Diagnosis:')
  const createdTime = new Date(sub.created_at).getTime()
  const updatedTime = new Date(sub.updated_at).getTime()
  const timeDiff = updatedTime - createdTime

  if (timeDiff < 1000) {
    console.log('   ⚠️  Subscription has NEVER been updated (created_at = updated_at)')
    console.log('   → This means you haven\'t actually changed the plan yet')
    console.log('   → Or the update didn\'t change status/plan_id/billing_cycle\n')
  } else {
    console.log(`   ✅ Subscription was updated ${Math.floor(timeDiff / 1000)} seconds after creation`)
    console.log('   → But no notification was created')
    console.log('   → Possible reasons:')
    console.log('      1. Status didn\'t change (OLD.status = NEW.status)')
    console.log('      2. Only plan_id or billing_cycle changed (trigger only fires on status change)')
    console.log('      3. Trigger function had an error\n')
  }

  console.log('💡 Remember: The trigger ONLY fires when status changes!')
  console.log('   Trigger condition: TG_OP = \'UPDATE\' AND OLD.status != NEW.status')
  console.log('   Changing plan or billing cycle WITHOUT status change won\'t trigger notification\n')
}

checkFunnellySubscription()
