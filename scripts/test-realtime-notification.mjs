#!/usr/bin/env node

/**
 * Test realtime notifications by creating a new notification
 * This should trigger the Realtime subscription in the browser
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testRealtimeNotification() {
  console.log('🧪 Testing realtime notification...\n')

  // Get first company
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .limit(1)

  if (!companies || companies.length === 0) {
    console.error('❌ No companies found')
    return
  }

  const companyId = companies[0].id

  // Create a new notification
  const newNotification = {
    company_id: companyId,
    title: `실시간 테스트 알림 ${new Date().toLocaleTimeString('ko-KR')}`,
    message: '이 알림은 Realtime 기능 테스트를 위해 생성되었습니다. 브라우저에서 즉시 보여야 합니다!',
    type: 'new_lead',
    is_read: false,
  }

  console.log('📤 Creating notification:')
  console.log(`   Title: ${newNotification.title}`)
  console.log(`   Type: ${newNotification.type}`)
  console.log()

  const { data, error } = await supabase
    .from('notifications')
    .insert(newNotification)
    .select()

  if (error) {
    console.error('❌ Error creating notification:', error)
    return
  }

  console.log('✅ Notification created successfully!')
  console.log(`   ID: ${data[0].id}`)
  console.log()
  console.log('🔍 Check your browser:')
  console.log('   1. NotificationBell 배지가 즉시 업데이트되어야 합니다')
  console.log('   2. 알림 페이지가 열려있다면 새 알림이 즉시 표시되어야 합니다')
  console.log('   3. 브라우저 콘솔에 "🔔 Realtime notification change" 로그가 보여야 합니다')
  console.log()
  console.log('💡 브라우저를 새로고침하지 않고 확인하세요!')
}

testRealtimeNotification().catch(console.error)
