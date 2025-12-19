#!/usr/bin/env node

/**
 * Test real-time notification INSERT event by creating a test notification
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

async function testRealtimeInsert() {
  console.log('🧪 Testing Realtime Notification INSERT\n')

  // Get a company for testing
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1)
    .single()

  if (!company) {
    console.log('❌ No company found')
    return
  }

  console.log(`📝 Creating test notification for: ${company.name}\n`)

  // Create a test notification
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      company_id: company.id,
      title: 'TEST - 실시간 알림 테스트',
      message: '이 알림은 테스트용입니다. NotificationBell 배지가 즉시 업데이트되어야 합니다.',
      type: 'subscription_changed',
      is_read: false,
    })
    .select()
    .single()

  if (error) {
    console.log('❌ Error:', error.message)
    return
  }

  console.log('✅ Test notification created!')
  console.log(`   ID: ${notification.id}`)
  console.log(`   Title: ${notification.title}\n`)

  console.log('👀 Now check your browser:')
  console.log('   1. Open /admin/dashboard page')
  console.log('   2. Check browser console for Realtime logs')
  console.log('   3. Verify NotificationBell badge updated')
  console.log(`   4. Expected badge count increase by 1\n`)

  console.log('⏰ Waiting 5 seconds before cleanup...')
  await new Promise(resolve => setTimeout(resolve, 5000))

  // Clean up
  console.log('🧹 Cleaning up test notification...')
  await supabase
    .from('notifications')
    .delete()
    .eq('id', notification.id)

  console.log('✅ Test notification deleted\n')
  console.log('Did the badge update in real-time? (Check browser)')
}

testRealtimeInsert()
