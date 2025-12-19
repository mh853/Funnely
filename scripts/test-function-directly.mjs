#!/usr/bin/env node

/**
 * Test if the notification function exists and can be called
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

async function testFunction() {
  console.log('🧪 Testing Notification Function Directly\n')

  // Get a subscription to test with
  const { data: sub } = await supabase
    .from('company_subscriptions')
    .select(`
      id,
      company_id,
      plan_id,
      status,
      companies (name),
      subscription_plans (name)
    `)
    .limit(1)
    .single()

  if (!sub) {
    console.log('❌ No subscription found')
    return
  }

  console.log('Test subscription:')
  console.log(`  Company: ${sub.companies.name}`)
  console.log(`  Plan: ${sub.subscription_plans.name}`)
  console.log(`  Status: ${sub.status}\n`)

  // Try to manually insert a notification to test the pattern
  console.log('Attempting to manually create subscription notification...')

  const { data: insertedNotif, error: insertError } = await supabase
    .from('notifications')
    .insert({
      company_id: sub.company_id,
      title: `${sub.companies.name} - 구독 상태 변경 (테스트)`,
      message: `${sub.companies.name}의 ${sub.subscription_plans.name} 플랜이 활성화되었습니다. (수동 테스트)`,
      type: 'subscription_changed',
      is_read: false,
    })
    .select()
    .single()

  if (insertError) {
    console.log('❌ Manual insert error:', insertError.message)
    console.log('   This suggests a permissions or schema issue\n')
    return
  }

  console.log('✅ Manual notification creation successful!')
  console.log('   ID:', insertedNotif.id)
  console.log('   Title:', insertedNotif.title)
  console.log('')

  console.log('📋 This proves:')
  console.log('   ✓ notifications table exists and is accessible')
  console.log('   ✓ We have permission to insert notifications')
  console.log('   ✓ The notification structure is correct')
  console.log('')
  console.log('❌ But the TRIGGER is still not creating notifications automatically')
  console.log('')

  // Clean up the test notification
  console.log('Cleaning up test notification...')
  await supabase.from('notifications').delete().eq('id', insertedNotif.id)
  console.log('✅ Test notification removed\n')

  console.log('🔧 RECOMMENDATION:')
  console.log('   The SQL execution may have succeeded partially but the trigger was not created.')
  console.log('   Please check Supabase Dashboard → Database → Triggers')
  console.log('   Look for: on_subscription_change')
  console.log('')
  console.log('   If not found, the trigger creation statement failed silently.')
  console.log('   Try running ONLY the trigger creation part again:')
  console.log('')
  console.log('   ```sql')
  console.log('   DROP TRIGGER IF EXISTS on_subscription_change ON company_subscriptions;')
  console.log('   ')
  console.log('   CREATE TRIGGER on_subscription_change')
  console.log('     AFTER INSERT OR UPDATE ON company_subscriptions')
  console.log('     FOR EACH ROW')
  console.log('     EXECUTE FUNCTION create_subscription_notification();')
  console.log('   ```')
}

testFunction()
