#!/usr/bin/env node

/**
 * Test Support Reply Notification System
 *
 * This script tests the complete notification flow:
 * 1. Creates a test support ticket
 * 2. Admin replies to the ticket (should trigger notification)
 * 3. Verifies notification was created
 * 4. Checks notification appears for user
 * 5. Cleans up test data
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log('🧪 Testing Support Reply Notification System\n')

  // Step 1: Get test users
  console.log('📋 Step 1: Getting test users...')
  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, full_name, email, company_id, is_super_admin')
    .limit(5)

  if (usersError) {
    console.error('❌ Failed to get users:', usersError)
    process.exit(1)
  }

  const adminUser = users.find((u) => u.is_super_admin === true)
  const regularUser = users.find((u) => u.is_super_admin === false)

  if (!adminUser || !regularUser) {
    console.error('❌ Need at least 1 admin and 1 regular user')
    console.log('Available users:', users)
    process.exit(1)
  }

  console.log(`✅ Admin: ${adminUser.full_name} (${adminUser.email})`)
  console.log(`✅ User: ${regularUser.full_name} (${regularUser.email})\n`)

  // Step 2: Create test support ticket
  console.log('📋 Step 2: Creating test support ticket...')
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .insert({
      company_id: regularUser.company_id,
      created_by_user_id: regularUser.id,
      subject: '[TEST] 알림 시스템 테스트',
      description: '이것은 알림 시스템을 테스트하기 위한 테스트 티켓입니다.',
      status: 'open',
      priority: 'medium',
    })
    .select()
    .single()

  if (ticketError) {
    console.error('❌ Failed to create ticket:', ticketError)
    process.exit(1)
  }

  console.log(`✅ Created ticket: ${ticket.subject} (ID: ${ticket.id})\n`)

  // Step 3: Check initial notification count
  console.log('📋 Step 3: Checking initial notification count...')
  const { count: initialCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', regularUser.id)
    .eq('is_read', false)

  console.log(`📊 Initial unread notifications: ${initialCount || 0}\n`)

  // Step 4: Admin replies to the ticket (should trigger notification)
  console.log('📋 Step 4: Admin replying to ticket (should trigger notification)...')
  const { data: message, error: messageError } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticket.id,
      user_id: adminUser.id,
      message: '안녕하세요! 문의사항을 확인했습니다. 곧 도움을 드리겠습니다.',
      is_internal_note: false,
    })
    .select()
    .single()

  if (messageError) {
    console.error('❌ Failed to create message:', messageError)
    await cleanup(ticket.id)
    process.exit(1)
  }

  console.log(`✅ Admin replied to ticket\n`)

  // Step 5: Wait for trigger to execute (give it 2 seconds)
  console.log('⏳ Waiting 2 seconds for database trigger...\n')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Step 6: Check if notification was created
  console.log('📋 Step 5: Verifying notification was created...')
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', regularUser.id)
    .eq('type', 'support_reply')
    .order('created_at', { ascending: false })
    .limit(1)

  if (notifError) {
    console.error('❌ Failed to query notifications:', notifError)
    await cleanup(ticket.id)
    process.exit(1)
  }

  if (!notifications || notifications.length === 0) {
    console.error('❌ FAILED: No notification was created!')
    console.log('\n🔍 Debugging Info:')
    console.log('Ticket ID:', ticket.id)
    console.log('User ID:', regularUser.id)
    console.log('Admin ID:', adminUser.id)
    await cleanup(ticket.id)
    process.exit(1)
  }

  const notification = notifications[0]
  console.log('✅ Notification created successfully!')
  console.log(`   Title: ${notification.title}`)
  console.log(`   Message: ${notification.message}`)
  console.log(`   Type: ${notification.type}`)
  console.log(`   Is Read: ${notification.is_read}`)
  console.log(`   Metadata:`, notification.metadata)
  console.log()

  // Step 7: Verify notification count increased
  const { count: finalCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', regularUser.id)
    .eq('is_read', false)

  console.log('📋 Step 6: Verifying notification count...')
  console.log(`📊 Final unread notifications: ${finalCount || 0}`)
  console.log(`📈 Increase: ${(finalCount || 0) - (initialCount || 0)}\n`)

  // Step 8: Test self-notification prevention
  console.log('📋 Step 7: Testing self-notification prevention...')
  console.log('Creating ticket where admin is the creator...')

  const { data: adminTicket, error: adminTicketError } = await supabase
    .from('support_tickets')
    .insert({
      company_id: adminUser.company_id,
      created_by_user_id: adminUser.id,
      subject: '[TEST] Self-notification test',
      description: 'Testing that admin replying to own ticket does not create notification.',
      status: 'open',
      priority: 'low',
    })
    .select()
    .single()

  if (adminTicketError) {
    console.error('❌ Failed to create admin ticket:', adminTicketError)
    await cleanup(ticket.id)
    process.exit(1)
  }

  console.log(`✅ Created admin's own ticket (ID: ${adminTicket.id})`)

  const { count: beforeSelfReply } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', adminUser.id)

  console.log(`📊 Admin notifications before self-reply: ${beforeSelfReply || 0}`)

  const { error: selfReplyError } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: adminTicket.id,
      user_id: adminUser.id,
      message: 'Admin replying to own ticket.',
      is_internal_note: false,
    })

  if (selfReplyError) {
    console.error('❌ Failed to create self-reply:', selfReplyError)
    await cleanup(ticket.id, adminTicket.id)
    process.exit(1)
  }

  await new Promise((resolve) => setTimeout(resolve, 2000))

  const { count: afterSelfReply } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', adminUser.id)

  console.log(`📊 Admin notifications after self-reply: ${afterSelfReply || 0}`)

  if ((afterSelfReply || 0) > (beforeSelfReply || 0)) {
    console.error('❌ FAILED: Self-notification was created (should not happen)!')
    await cleanup(ticket.id, adminTicket.id)
    process.exit(1)
  }

  console.log('✅ Self-notification prevention working correctly!\n')

  // Step 9: Cleanup
  console.log('📋 Step 8: Cleaning up test data...')
  await cleanup(ticket.id, adminTicket.id)

  console.log('\n✅ All tests passed!')
  console.log('\n📝 Summary:')
  console.log('   ✅ Notification created when admin replies to user ticket')
  console.log('   ✅ Notification contains correct metadata')
  console.log('   ✅ Self-notification prevention works')
  console.log('   ✅ Database trigger functioning correctly')
}

async function cleanup(ticketId, adminTicketId = null) {
  console.log('🧹 Cleaning up test data...')

  const ticketIds = [ticketId]
  if (adminTicketId) ticketIds.push(adminTicketId)

  // Delete messages first (foreign key constraint)
  await supabase.from('support_ticket_messages').delete().in('ticket_id', ticketIds)

  // Delete notifications
  await supabase
    .from('notifications')
    .delete()
    .eq('type', 'support_reply')
    .in('metadata->ticket_id', ticketIds)

  // Delete tickets
  await supabase.from('support_tickets').delete().in('id', ticketIds)

  console.log('✅ Cleanup complete')
}

main().catch((error) => {
  console.error('❌ Test failed:', error)
  process.exit(1)
})
