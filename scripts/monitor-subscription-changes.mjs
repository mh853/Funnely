#!/usr/bin/env node

/**
 * Monitor subscription changes and notification creation in real-time
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

async function monitor() {
  console.log('👀 Monitoring Subscription Changes and Notifications\n')

  // Show current companies and subscriptions
  const { data: subs } = await supabase
    .from('company_subscriptions')
    .select(`
      id,
      status,
      companies (id, name),
      subscription_plans (name),
      billing_cycle
    `)
    .order('created_at', { ascending: false })

  console.log('📊 Current Subscriptions:')
  subs?.forEach((s, i) => {
    console.log(`${i + 1}. ${s.companies.name}`)
    console.log(`   Company ID: ${s.companies.id}`)
    console.log(`   Plan: ${s.subscription_plans.name} (${s.billing_cycle})`)
    console.log(`   Status: ${s.status}\n`)
  })

  console.log('🔔 Starting real-time monitoring...')
  console.log('   Watching: company_subscriptions table')
  console.log('   Watching: notifications table\n')
  console.log('💡 Now go to /dashboard/subscription and change a plan!\n')

  let lastNotificationCount = 0

  // Get initial notification count
  const { count: initialCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })

  lastNotificationCount = initialCount || 0
  console.log(`📋 Initial notifications count: ${lastNotificationCount}\n`)

  // Subscribe to subscription changes
  const subsChannel = supabase
    .channel('subscription-monitor')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'company_subscriptions',
      },
      async (payload) => {
        console.log('🔄 SUBSCRIPTION CHANGE DETECTED!')
        console.log('   Event:', payload.eventType)

        if (payload.eventType === 'UPDATE') {
          const oldData = payload.old as any
          const newData = payload.new as any

          // Get company name
          const { data: company } = await supabase
            .from('companies')
            .select('name')
            .eq('id', newData.company_id)
            .single()

          console.log(`   Company: ${company?.name || 'Unknown'}`)
          console.log(`   Company ID: ${newData.company_id}`)

          if (oldData.status !== newData.status) {
            console.log(`   Status changed: ${oldData.status} → ${newData.status}`)
          }
          if (oldData.plan_id !== newData.plan_id) {
            console.log(`   Plan changed: ${oldData.plan_id} → ${newData.plan_id}`)
          }
          if (oldData.billing_cycle !== newData.billing_cycle) {
            console.log(`   Billing cycle: ${oldData.billing_cycle} → ${newData.billing_cycle}`)
          }
        }

        // Wait a moment for trigger to execute
        await new Promise(resolve => setTimeout(resolve, 500))

        // Check if new notification was created
        const { count: currentCount } = await supabase
          .from('notifications')
          .select('*', { count: 'exact', head: true })

        if (currentCount && currentCount > lastNotificationCount) {
          console.log(`\n   ✅ New notification created! (${lastNotificationCount} → ${currentCount})`)

          // Get the new notification
          const { data: newNotif } = await supabase
            .from('notifications')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(1)
            .single()

          if (newNotif) {
            console.log('   📧 Notification Details:')
            console.log(`      Type: ${newNotif.type}`)
            console.log(`      Title: ${newNotif.title}`)
            console.log(`      Message: ${newNotif.message}`)
            console.log(`      Company ID: ${newNotif.company_id}`)
          }

          lastNotificationCount = currentCount
        } else {
          console.log(`\n   ⚠️  No notification created (trigger didn't fire)`)
          console.log(`      Possible reason: Status didn't change (OLD.status = NEW.status)`)
        }

        console.log('\n')
      }
    )
    .subscribe()

  console.log('✅ Monitoring active. Press Ctrl+C to stop.\n')
}

monitor()
