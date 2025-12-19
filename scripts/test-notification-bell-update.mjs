#!/usr/bin/env node

/**
 * Test NotificationBell real-time update functionality
 *
 * This script:
 * 1. Checks current unread notification count
 * 2. Creates a test notification (unread)
 * 3. Waits to allow Realtime/polling to detect the change
 * 4. Marks it as read
 * 5. Waits again to verify badge updates
 * 6. Cleans up the test notification
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

async function testNotificationBellUpdate() {
  console.log('🧪 Testing NotificationBell Update Mechanism\n')

  // Get a test company
  const { data: company } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1)
    .single()

  if (!company) {
    console.log('❌ No company found')
    return
  }

  console.log(`📝 Test Company: ${company.name}\n`)

  // Step 1: Check current unread count
  console.log('📊 Step 1: Current unread notification count')
  const { data: currentNotifs, count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: false })
    .eq('is_read', false)

  console.log(`   Current unread count: ${unreadCount}`)
  console.log(`   Expected badge number: ${unreadCount > 99 ? '99+' : unreadCount}\n`)

  // Step 2: Create a test notification
  console.log('📝 Step 2: Creating test notification (unread)')
  const { data: newNotif, error: createError } = await supabase
    .from('notifications')
    .insert({
      company_id: company.id,
      title: 'TEST - NotificationBell 업데이트 테스트',
      message: '이 알림은 실시간 배지 업데이트 테스트용입니다.',
      type: 'subscription_changed',
      is_read: false,
    })
    .select()
    .single()

  if (createError) {
    console.log('❌ Error creating notification:', createError.message)
    return
  }

  console.log('✅ Test notification created!')
  console.log(`   Notification ID: ${newNotif.id}`)
  console.log(`   Expected new badge: ${unreadCount + 1}\n`)

  // Step 3: Wait for Realtime/Polling to detect
  console.log('⏰ Step 3: Waiting 12 seconds for Realtime/Polling detection...')
  console.log('   (Polling interval is 10 seconds)')
  await new Promise(resolve => setTimeout(resolve, 12000))

  console.log('👀 Check your browser NOW:')
  console.log(`   - Expected badge: ${unreadCount + 1}`)
  console.log(`   - If badge updated → Realtime OR Polling is working ✅`)
  console.log(`   - If badge still shows ${unreadCount} → Neither mechanism working ❌\n`)

  // Step 4: Mark notification as read
  console.log('📝 Step 4: Marking notification as read')
  const { error: updateError } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', newNotif.id)

  if (updateError) {
    console.log('❌ Error updating notification:', updateError.message)
    return
  }

  console.log('✅ Notification marked as read')
  console.log(`   Expected new badge: ${unreadCount}\n`)

  // Step 5: Wait again for update detection
  console.log('⏰ Step 5: Waiting 12 seconds for badge update...')
  await new Promise(resolve => setTimeout(resolve, 12000))

  console.log('👀 Check your browser AGAIN:')
  console.log(`   - Expected badge: ${unreadCount}`)
  console.log(`   - If badge updated → Real-time updates working! ✅`)
  console.log(`   - If badge still shows ${unreadCount + 1} → Updates not working ❌\n`)

  // Step 6: Cleanup
  console.log('🧹 Step 6: Cleaning up test notification...')
  await supabase
    .from('notifications')
    .delete()
    .eq('id', newNotif.id)

  console.log('✅ Test notification deleted\n')

  // Final diagnosis
  console.log('📋 DIAGNOSIS CHECKLIST:')
  console.log('   [ ] Badge showed +1 after Step 3 (create) → Realtime/Polling detects INSERT')
  console.log('   [ ] Badge showed -1 after Step 5 (read) → Realtime/Polling detects UPDATE')
  console.log('   [ ] Console shows "⏰ [NotificationBell] Polling..." every 10s')
  console.log('   [ ] Console shows "🔔 [NotificationBell] Realtime notification change"')
  console.log('')
  console.log('💡 If only polling works (no Realtime logs):')
  console.log('   - Badge will update, but with 10-second delay')
  console.log('   - This is acceptable as fallback mechanism')
  console.log('   - Investigate Realtime subscription for optimization')
}

testNotificationBellUpdate()
