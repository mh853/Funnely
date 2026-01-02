#!/usr/bin/env node

/**
 * Test: Create a new support ticket and verify admin notification is created
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
  console.log('🧪 Testing New Ticket → Admin Notification Flow\n')

  // 1. Get a regular user (not admin)
  const { data: regularUser, error: userError } = await supabase
    .from('users')
    .select('id, full_name, email, company_id, is_super_admin')
    .eq('email', 'munong2@gmail.com')
    .single()

  if (userError || !regularUser) {
    console.error('❌ User not found:', userError)
    process.exit(1)
  }

  console.log(`✅ User: ${regularUser.full_name} (${regularUser.email})`)
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
  })
  console.log()

  // 3. Create a test ticket
  console.log('📝 Creating test support ticket...')
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      company_id: regularUser.company_id,
      created_by_user_id: regularUser.id,
      subject: '테스트 티켓 - 관리자 알림 확인',
      description: '이 티켓은 관리자 알림 기능 테스트용입니다.',
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

  // 4. Wait a bit for trigger to execute
  console.log('⏳ Waiting for trigger to execute...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 5. Check if notifications were created for admins
  console.log('🔍 Checking admin notifications...\n')
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('type', 'new_support_ticket')
    .eq('company_id', regularUser.company_id)
    .order('created_at', { ascending: false })
    .limit(10)

  if (notifError) {
    console.error('❌ Failed to fetch notifications:', notifError)
    process.exit(1)
  }

  console.log(`📬 Notifications created: ${notifications.length}`)
  notifications.forEach((notif) => {
    console.log(`   - User ID: ${notif.user_id}`)
    console.log(`     Title: ${notif.title}`)
    console.log(`     Message: ${notif.message}`)
    console.log(`     Metadata:`, notif.metadata)
    console.log()
  })

  if (notifications.length === 0) {
    console.log('⚠️ No notifications found!')
    console.log('   Possible reasons:')
    console.log('   1. Migration not applied yet')
    console.log('   2. Trigger not working')
    console.log('   3. No admins in company')
    console.log('\n💡 Please apply the migration:')
    console.log('   supabase/migrations/20260102120000_new_ticket_admin_notifications.sql')
  } else if (notifications.length === admins.length) {
    console.log('✅ SUCCESS! All admins received notifications!')
  } else {
    console.log(`⚠️ Expected ${admins.length} notifications, got ${notifications.length}`)
  }

  console.log('\n🧹 Cleanup: Delete test ticket? (y/N)')
  // For now, keep it for manual verification
  console.log('   Keeping test ticket for manual verification')
  console.log(`   Ticket ID: ${ticket.id}`)
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
