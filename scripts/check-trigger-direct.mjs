#!/usr/bin/env node

/**
 * Direct check if trigger exists using Supabase client
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

async function checkTrigger() {
  console.log('🔍 Checking trigger status directly...\n')

  // Try to manually trigger a subscription update to see if notifications are created
  console.log('📝 Testing: Creating a test subscription update...\n')

  // Get one subscription
  const { data: subs } = await supabase
    .from('company_subscriptions')
    .select('id, status, company_id, companies(name), subscription_plans(name)')
    .limit(1)
    .single()

  if (!subs) {
    console.log('❌ No subscriptions found to test')
    return
  }

  console.log('   Using subscription:')
  console.log(`   - Company: ${subs.companies.name}`)
  console.log(`   - Plan: ${subs.subscription_plans.name}`)
  console.log(`   - Current status: ${subs.status}\n`)

  // Count notifications before
  const { count: beforeCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', subs.company_id)

  console.log(`   Notifications before: ${beforeCount}`)

  // Perform a dummy update (set status to same value)
  console.log('   Performing test update...')
  const { error: updateError } = await supabase
    .from('company_subscriptions')
    .update({ status: subs.status })
    .eq('id', subs.id)

  if (updateError) {
    console.log('   ❌ Update error:', updateError.message)
    return
  }

  // Wait a moment
  await new Promise(resolve => setTimeout(resolve, 1000))

  // Count notifications after
  const { count: afterCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', subs.company_id)

  console.log(`   Notifications after: ${afterCount}\n`)

  if (afterCount === beforeCount) {
    console.log('❌ TRIGGER NOT WORKING')
    console.log('   → No notification was created after subscription update')
    console.log('   → This confirms the trigger is NOT installed\n')
    console.log('🔧 ACTION REQUIRED:')
    console.log('   The migration file needs to be applied to the database.')
    console.log('   Please run the migration using Supabase Dashboard SQL Editor:\n')
    console.log('   1. Open: https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql')
    console.log('   2. Click "New query"')
    console.log('   3. Copy ENTIRE content from: supabase/migrations/20251218000000_enable_subscriptions_realtime.sql')
    console.log('   4. Paste and click "Run"')
    console.log('   5. Verify success message\n')
  } else {
    console.log('✅ TRIGGER IS WORKING!')
    console.log(`   → ${afterCount - beforeCount} new notification(s) created`)
    console.log('   → The trigger is properly installed and functional\n')
  }
}

checkTrigger()
