#!/usr/bin/env node

/**
 * Debug subscription notification trigger system
 *
 * Checks:
 * 1. Trigger existence in database
 * 2. Function existence
 * 3. Realtime publication status
 * 4. Manual trigger test
 * 5. Existing notifications by type
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

async function debugTriggerSystem() {
  console.log('🔍 Debugging Subscription Notification System\n')

  // 1. Check if trigger exists
  console.log('1️⃣ Checking trigger existence...')
  const { data: triggers, error: triggerError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT tgname, tgtype, tgenabled, tgrelid::regclass as table_name
        FROM pg_trigger
        WHERE tgname = 'on_subscription_change'
      `
    })
    .single()

  if (triggerError) {
    console.log('   ⚠️  Cannot query triggers directly, trying alternative method...')

    // Alternative: Check via information_schema
    const { data: altCheck } = await supabase
      .from('pg_trigger')
      .select('*')
      .eq('tgname', 'on_subscription_change')
      .maybeSingle()

    if (!altCheck) {
      console.log('   ❌ Trigger NOT FOUND in database')
      console.log('   → Migration was not applied successfully\n')
    } else {
      console.log('   ✅ Trigger exists')
      console.log('   → Enabled:', altCheck.tgenabled)
      console.log('   → Table:', altCheck.table_name, '\n')
    }
  } else {
    if (!triggers || triggers.length === 0) {
      console.log('   ❌ Trigger NOT FOUND in database')
      console.log('   → Migration was not applied successfully\n')
    } else {
      console.log('   ✅ Trigger exists:', triggers)
      console.log('')
    }
  }

  // 2. Check if function exists
  console.log('2️⃣ Checking notification function...')
  const { data: functions, error: funcError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT proname, prosrc
        FROM pg_proc
        WHERE proname = 'create_subscription_notification'
      `
    })
    .single()

  if (funcError) {
    console.log('   ⚠️  Cannot query functions directly\n')
  } else {
    if (!functions || functions.length === 0) {
      console.log('   ❌ Function NOT FOUND')
      console.log('   → Migration was not applied successfully\n')
    } else {
      console.log('   ✅ Function exists\n')
    }
  }

  // 3. Check Realtime publication
  console.log('3️⃣ Checking Realtime publication...')
  const { data: realtimeTables, error: realtimeError } = await supabase
    .rpc('exec_sql', {
      sql: `
        SELECT tablename
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
          AND tablename = 'company_subscriptions'
      `
    })
    .single()

  if (realtimeError) {
    console.log('   ⚠️  Cannot query publication status\n')
  } else {
    if (!realtimeTables || realtimeTables.length === 0) {
      console.log('   ❌ company_subscriptions NOT in Realtime publication')
      console.log('   → Realtime not enabled\n')
    } else {
      console.log('   ✅ company_subscriptions in Realtime publication\n')
    }
  }

  // 4. Check existing notifications by type
  console.log('4️⃣ Checking notifications by type...')
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('type, created_at, title')
    .order('created_at', { ascending: false })
    .limit(20)

  if (notifError) {
    console.log('   ❌ Error:', notifError.message, '\n')
  } else {
    const typeGroups = notifications.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {})

    console.log('   📊 Notification types:')
    Object.entries(typeGroups).forEach(([type, count]) => {
      console.log(`      ${type}: ${count}`)
    })
    console.log('')

    const subscriptionNotifs = notifications.filter(
      n => n.type === 'subscription_started' || n.type === 'subscription_changed'
    )

    if (subscriptionNotifs.length === 0) {
      console.log('   ⚠️  No subscription notifications found\n')
    } else {
      console.log('   ✅ Found', subscriptionNotifs.length, 'subscription notifications:')
      subscriptionNotifs.forEach(n => {
        console.log(`      - [${n.type}] ${n.title}`)
        console.log(`        Created: ${new Date(n.created_at).toLocaleString('ko-KR')}`)
      })
      console.log('')
    }
  }

  // 5. Check existing subscriptions
  console.log('5️⃣ Checking company_subscriptions...')
  const { data: subscriptions, error: subError } = await supabase
    .from('company_subscriptions')
    .select(`
      id,
      status,
      created_at,
      companies (name),
      subscription_plans (name)
    `)
    .order('created_at', { ascending: false })

  if (subError) {
    console.log('   ❌ Error:', subError.message, '\n')
  } else {
    console.log(`   ✓ Found ${subscriptions.length} subscriptions:`)
    subscriptions.forEach((s, i) => {
      console.log(`      ${i + 1}. ${s.companies.name} - ${s.subscription_plans.name} (${s.status})`)
      console.log(`         Created: ${new Date(s.created_at).toLocaleString('ko-KR')}`)
    })
    console.log('')
  }

  // 6. Summary and recommendations
  console.log('📋 SUMMARY AND RECOMMENDATIONS\n')

  const hasSubscriptions = subscriptions && subscriptions.length > 0
  const hasNotifications = notifications && notifications.length > 0
  const hasSubscriptionNotifs = notifications?.some(
    n => n.type === 'subscription_started' || n.type === 'subscription_changed'
  )

  if (hasSubscriptions && !hasSubscriptionNotifs) {
    console.log('⚠️  PROBLEM IDENTIFIED:')
    console.log('   - Subscriptions exist in database')
    console.log('   - But NO subscription notifications were created')
    console.log('   - This means the trigger is NOT installed or NOT working\n')

    console.log('🔧 RECOMMENDED ACTIONS:')
    console.log('   1. Open Supabase Dashboard SQL Editor')
    console.log('   2. Run the following query to check trigger:')
    console.log('      ```sql')
    console.log('      SELECT tgname, tgenabled')
    console.log('      FROM pg_trigger')
    console.log('      WHERE tgname = \'on_subscription_change\';')
    console.log('      ```')
    console.log('   3. If no results, the migration was NOT applied')
    console.log('   4. Copy and run the FULL migration file again\n')
  } else if (!hasSubscriptions) {
    console.log('⚠️  No subscriptions found to test trigger\n')
  } else if (hasSubscriptionNotifs) {
    console.log('✅ System working correctly!')
    console.log('   - Trigger is installed and working')
    console.log('   - Subscription notifications are being created\n')
  }
}

debugTriggerSystem()
