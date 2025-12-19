#!/usr/bin/env node

/**
 * Verify trigger installation with detailed diagnostics
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

async function verifyInstallation() {
  console.log('🔍 Detailed Trigger Installation Verification\n')

  // 1. Check notifications count
  console.log('1️⃣ Current Notifications Status:')
  const { data: allNotifs, error: notifsError } = await supabase
    .from('notifications')
    .select('type, created_at, title, company_id')
    .order('created_at', { ascending: false })

  if (notifsError) {
    console.log('   ❌ Error:', notifsError.message)
  } else {
    console.log(`   Total notifications: ${allNotifs.length}`)

    const typeGroups = allNotifs.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {})

    console.log('   By type:')
    Object.entries(typeGroups).forEach(([type, count]) => {
      console.log(`      ${type}: ${count}`)
    })

    const subscriptionNotifs = allNotifs.filter(
      n => n.type === 'subscription_started' || n.type === 'subscription_changed'
    )

    if (subscriptionNotifs.length > 0) {
      console.log('\n   ✅ Subscription notifications found:')
      subscriptionNotifs.forEach(n => {
        console.log(`      - [${n.type}] ${n.title}`)
        console.log(`        Created: ${new Date(n.created_at).toLocaleString('ko-KR')}`)
      })
    } else {
      console.log('   ⚠️  No subscription notifications found')
    }
  }

  // 2. Check subscriptions
  console.log('\n2️⃣ Current Subscriptions:')
  const { data: subs, error: subsError } = await supabase
    .from('company_subscriptions')
    .select(`
      id,
      status,
      created_at,
      updated_at,
      companies (name),
      subscription_plans (name)
    `)
    .order('created_at', { ascending: false })

  if (subsError) {
    console.log('   ❌ Error:', subsError.message)
  } else {
    console.log(`   Total subscriptions: ${subs.length}`)
    subs.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.companies.name} - ${s.subscription_plans.name} (${s.status})`)
      console.log(`      Created: ${new Date(s.created_at).toLocaleString('ko-KR')}`)
      if (s.updated_at) {
        console.log(`      Updated: ${new Date(s.updated_at).toLocaleString('ko-KR')}`)
      }
    })
  }

  // 3. Manual trigger test
  console.log('\n3️⃣ Manual Trigger Test:')

  if (subs && subs.length > 0) {
    const testSub = subs[0]
    console.log(`   Testing with: ${testSub.companies.name} - ${testSub.subscription_plans.name}`)

    const { count: beforeCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })

    console.log(`   Notifications before update: ${beforeCount}`)

    // Perform update
    const { error: updateError } = await supabase
      .from('company_subscriptions')
      .update({ status: testSub.status })
      .eq('id', testSub.id)

    if (updateError) {
      console.log('   ❌ Update error:', updateError.message)
    } else {
      console.log('   ✅ Update successful')
    }

    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 1000))

    const { count: afterCount } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })

    console.log(`   Notifications after update: ${afterCount}`)

    if (afterCount > beforeCount) {
      console.log(`   ✅ SUCCESS! ${afterCount - beforeCount} notification(s) created`)
      console.log('   → Trigger is working correctly!')

      // Show the new notification
      const { data: newNotif } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (newNotif) {
        console.log('\n   New notification details:')
        console.log(`      Type: ${newNotif.type}`)
        console.log(`      Title: ${newNotif.title}`)
        console.log(`      Message: ${newNotif.message}`)
      }
    } else {
      console.log('   ❌ FAILED: No new notifications created')
      console.log('   → Trigger is NOT working')
    }
  }

  console.log('\n4️⃣ Diagnosis:')

  const hasSubscriptions = subs && subs.length > 0
  const hasSubscriptionNotifs = allNotifs?.some(
    n => n.type === 'subscription_started' || n.type === 'subscription_changed'
  )

  if (!hasSubscriptions) {
    console.log('   ⚠️  No subscriptions found to test')
  } else if (hasSubscriptionNotifs) {
    console.log('   ✅ System is working!')
    console.log('      - Trigger is installed')
    console.log('      - Notifications are being created')
  } else {
    console.log('   ❌ Trigger is NOT installed correctly')
    console.log('\n   Possible causes:')
    console.log('      1. SQL was executed on wrong database')
    console.log('      2. SQL execution had errors (check Supabase Dashboard logs)')
    console.log('      3. Trigger was created but function has errors')
    console.log('\n   Next steps:')
    console.log('      1. Check Supabase Dashboard → Logs → Error logs')
    console.log('      2. Try running SQL again with careful attention to success message')
    console.log('      3. Verify you are on correct project (wsrjfdnxsggwymlrfqcc)')
  }
}

verifyInstallation()
