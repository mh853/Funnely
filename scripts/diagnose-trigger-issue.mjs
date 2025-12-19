#!/usr/bin/env node

/**
 * Deep diagnosis of why trigger is not firing
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

async function diagnose() {
  console.log('🔬 Deep Trigger Diagnosis\n')

  // Get a subscription
  const { data: sub } = await supabase
    .from('company_subscriptions')
    .select(`
      id,
      company_id,
      plan_id,
      status,
      companies (id, name),
      subscription_plans (id, name)
    `)
    .limit(1)
    .single()

  if (!sub) {
    console.log('❌ No subscription found')
    return
  }

  console.log('🎯 Test Subscription:')
  console.log(`   Company ID: ${sub.company_id}`)
  console.log(`   Company Name: ${sub.companies.name}`)
  console.log(`   Plan ID: ${sub.plan_id}`)
  console.log(`   Plan Name: ${sub.subscription_plans.name}`)
  console.log(`   Current Status: ${sub.status}\n`)

  // Check 1: Test with actual status change (not same value)
  console.log('Test 1: Trigger condition - Status must actually CHANGE')
  console.log(`   Current status: ${sub.status}`)
  console.log(`   Trigger condition: TG_OP = 'UPDATE' AND OLD.status != NEW.status`)
  console.log(`   Problem: We're updating status to SAME value (${sub.status} → ${sub.status})`)
  console.log(`   This means: OLD.status = NEW.status, so trigger WON'T fire!\n`)

  // Check 2: Try with a different status
  const newStatus = sub.status === 'trial' ? 'active' : 'trial'

  console.log(`Test 2: Let's try changing status to DIFFERENT value`)
  console.log(`   Will change: ${sub.status} → ${newStatus}\n`)

  const { count: beforeCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })

  console.log(`   Notifications before: ${beforeCount}`)

  // Update to DIFFERENT status
  const { error: updateError } = await supabase
    .from('company_subscriptions')
    .update({ status: newStatus })
    .eq('id', sub.id)

  if (updateError) {
    console.log('   ❌ Update error:', updateError.message)
    return
  }

  console.log(`   ✅ Updated status: ${sub.status} → ${newStatus}`)

  // Wait for trigger
  await new Promise(resolve => setTimeout(resolve, 1500))

  const { count: afterCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })

  console.log(`   Notifications after: ${afterCount}\n`)

  if (afterCount > beforeCount) {
    console.log('   ✅ SUCCESS! Trigger is working!')
    console.log(`   → ${afterCount - beforeCount} notification(s) created\n`)

    // Show the new notification
    const { data: newNotif } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (newNotif) {
      console.log('   📧 New Notification Details:')
      console.log(`      Type: ${newNotif.type}`)
      console.log(`      Title: ${newNotif.title}`)
      console.log(`      Message: ${newNotif.message}`)
      console.log(`      Created: ${new Date(newNotif.created_at).toLocaleString('ko-KR')}\n`)
    }

    // Revert the status change
    console.log('   🔄 Reverting status change...')
    await supabase
      .from('company_subscriptions')
      .update({ status: sub.status })
      .eq('id', sub.id)
    console.log('   ✅ Reverted\n')

  } else {
    console.log('   ❌ FAILED: Still no notification created\n')
    console.log('   This means the trigger or function has an error.\n')

    console.log('   🔍 Possible Issues:')
    console.log('      1. Function has runtime error (check company/plan name lookup)')
    console.log('      2. Trigger not attached to table')
    console.log('      3. Permissions issue with SECURITY DEFINER\n')

    console.log('   📋 Next Steps:')
    console.log('      1. Check Supabase Dashboard → Logs → Postgres logs')
    console.log('      2. Look for function execution errors')
    console.log('      3. Verify trigger exists in Database → Triggers\n')
  }

  console.log('💡 KEY INSIGHT:')
  console.log('   The test script was updating status to SAME value!')
  console.log('   Trigger condition: OLD.status != NEW.status')
  console.log('   So trigger would never fire with same-value updates.\n')
}

diagnose()
