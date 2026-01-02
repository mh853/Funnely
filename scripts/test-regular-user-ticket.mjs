#!/usr/bin/env node

/**
 * Test: Regular user creates ticket → Admin gets notification
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
  console.log('🧪 Testing: Regular User Creates Ticket → Admin Gets Notification\n')

  // 1. Get a regular user (not admin)
  const { data: regularUser, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, company_id, is_super_admin')
    .eq('email', 'woowoo4864@gmail.com') // Regular user from check-users
    .single()

  if (userError || !regularUser) {
    console.error('❌ Regular user not found:', userError)
    process.exit(1)
  }

  console.log(`✅ Regular User: ${regularUser.full_name} (${regularUser.email})`)
  console.log(`   Company ID: ${regularUser.company_id}`)
  console.log(`   Is Admin: ${regularUser.is_super_admin}\n`)

  // 2. Get admins in the same company
  const { data: admins, error: adminsError } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('company_id', regularUser.company_id)
    .eq('is_super_admin', true)

  if (adminsError) {
    console.error('❌ Failed to fetch admins:', adminsError)
    process.exit(1)
  }

  console.log(`📋 Admins in company: ${admins.length}`)
  admins.forEach((admin) => {
    console.log(`   - ${admin.full_name} (${admin.email})`)
    console.log(`     ID: ${admin.id}`)
  })
  console.log()

  // 3. Create a test ticket AS REGULAR USER
  console.log('📝 Creating support ticket as regular user...')
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      company_id: regularUser.company_id,
      created_by_user_id: regularUser.id, // Regular user creates ticket
      subject: '일반 사용자 문의 - 관리자 알림 테스트',
      description: '일반 사용자가 티켓을 생성하면 관리자에게 알림이 가야 합니다.',
      status: 'open',
      priority: 'medium',
      category: 'technical',
    })
    .select()
    .single()

  if (ticketError) {
    console.error('❌ Failed to create ticket:', ticketError)
    process.exit(1)
  }

  console.log(`✅ Ticket created: ${ticket.subject}`)
  console.log(`   Ticket ID: ${ticket.id}\n`)

  // 4. Wait for trigger to execute
  console.log('⏳ Waiting for trigger to execute (2 seconds)...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 5. Check if notifications were created for admins
  console.log('🔍 Checking admin notifications...\n')

  for (const admin of admins) {
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', admin.id)
      .eq('type', 'new_support_ticket')
      .order('created_at', { ascending: false })
      .limit(1)

    if (notifError) {
      console.error(`❌ Failed to fetch notifications for ${admin.full_name}:`, notifError)
      continue
    }

    if (notifications.length > 0) {
      const notif = notifications[0]
      console.log(`✅ Notification found for ${admin.full_name}:`)
      console.log(`   - Title: ${notif.title}`)
      console.log(`   - Message: ${notif.message}`)
      console.log(`   - Created: ${notif.created_at}`)
      console.log(`   - Metadata:`, JSON.stringify(notif.metadata, null, 2))
    } else {
      console.log(`❌ No notification found for ${admin.full_name}`)
    }
    console.log()
  }

  console.log('\n💡 Test ticket created:')
  console.log(`   Ticket ID: ${ticket.id}`)
  console.log(`   You can view it at: /dashboard/support/${ticket.id}`)
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
