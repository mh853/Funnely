#!/usr/bin/env node

/**
 * Create a manual test notification
 * This creates a real notification that you can see in the UI
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('🧪 Creating real test notification for manual verification\n')

  // Get current user (you)
  const { data: user, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, company_id')
    .eq('email', 'munong2@gmail.com')
    .single()

  if (userError || !user) {
    console.error('❌ User not found:', userError)
    process.exit(1)
  }

  console.log(`✅ User: ${user.full_name} (${user.email})`)

  // Create test notification
  const { data: notification, error } = await supabase
    .from('notifications')
    .insert({
      user_id: user.id,
      company_id: user.company_id,
      title: '기술지원 답변',
      message: '테스트 관리자님이 "테스트 티켓" 티켓에 답변했습니다.',
      type: 'support_reply',
      metadata: {
        ticket_id: 'test-ticket-id',
        admin_name: '테스트 관리자',
        ticket_subject: '테스트 티켓',
      },
      is_read: false,
    })
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to create notification:', error)
    process.exit(1)
  }

  console.log('\n✅ Test notification created!')
  console.log('   ID:', notification.id)
  console.log('   Title:', notification.title)
  console.log('   Message:', notification.message)
  console.log('\n📱 Now check the notification bell in the dashboard!')
  console.log('   It should show 1 unread notification.')
  console.log('\n⏰ The notification should appear within 10 seconds (Realtime + Polling)')
  console.log('\n🧹 To delete this test notification later:')
  console.log(`   Run this script again with the ID: ${notification.id}`)
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
