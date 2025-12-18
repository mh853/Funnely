#!/usr/bin/env node

/**
 * Check if subscription notification trigger exists
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env.local from project root
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTrigger() {
  console.log('🔍 Checking subscription notification system...\n')

  // 1. Check if notifications table has subscription-related entries
  console.log('1️⃣ Checking notifications table...')
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .in('type', ['subscription_started', 'subscription_changed'])
    .order('created_at', { ascending: false })
    .limit(5)

  if (notifError) {
    console.log('   ❌ Error:', notifError.message)
  } else {
    console.log(`   ✓ Found ${notifications.length} subscription notifications`)
    if (notifications.length > 0) {
      console.log('\n   Most recent notifications:')
      notifications.forEach((n, i) => {
        console.log(`   ${i + 1}. [${n.type}] ${n.title}`)
        console.log(`      ${n.message}`)
        console.log(`      Created: ${new Date(n.created_at).toLocaleString('ko-KR')}`)
      })
    } else {
      console.log('   ⚠️  No subscription notifications found')
      console.log('      This suggests the trigger may not be active yet')
    }
  }

  // 2. Check company_subscriptions table
  console.log('\n2️⃣ Checking company_subscriptions...')
  const { data: subscriptions, error: subError } = await supabase
    .from('company_subscriptions')
    .select('id, company_id, status, created_at')
    .order('created_at', { ascending: false })
    .limit(3)

  if (subError) {
    console.log('   ❌ Error:', subError.message)
  } else {
    console.log(`   ✓ Found ${subscriptions.length} subscriptions`)
    if (subscriptions.length > 0) {
      subscriptions.forEach((s, i) => {
        console.log(`   ${i + 1}. Status: ${s.status}, Created: ${new Date(s.created_at).toLocaleString('ko-KR')}`)
      })
    }
  }

  // 3. Test by checking if we can query system tables (requires superuser)
  console.log('\n3️⃣ Attempting to check trigger existence (may fail due to permissions)...')
  const { data: triggerCheck, error: triggerError } = await supabase.rpc(
    'query',
    { query: "SELECT EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'on_subscription_change')" }
  )

  if (triggerError) {
    console.log('   ⚠️  Cannot query system tables (expected):', triggerError.message)
    console.log('      Use Supabase Dashboard SQL Editor to verify')
  } else {
    console.log('   ✓ Trigger check result:', triggerCheck)
  }

  // Summary
  console.log('\n📊 Summary:')
  if (notifications && notifications.length > 0) {
    console.log('✅ Notification system appears to be working')
    console.log('   Recent subscription notifications found')
  } else if (subscriptions && subscriptions.length > 0) {
    console.log('⚠️  Subscriptions exist but no notifications found')
    console.log('   → Trigger may not be installed yet')
    console.log('   → Apply migration via Supabase Dashboard SQL Editor')
  } else {
    console.log('❓ No subscriptions found to test')
  }

  console.log('\n📝 To manually verify trigger in Supabase Dashboard:')
  console.log('   1. Go to SQL Editor')
  console.log("   2. Run: SELECT tgname FROM pg_trigger WHERE tgname = 'on_subscription_change';")
  console.log('   3. If no results, apply the migration file')
}

checkTrigger()
