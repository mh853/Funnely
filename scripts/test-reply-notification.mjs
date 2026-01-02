#!/usr/bin/env node

/**
 * Test: Admin replies to ticket → User gets notification
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
  console.log('🧪 Testing: Admin Replies to Ticket → User Gets Notification\n')

  // 1. Get the ticket we created earlier
  const ticketId = 'eb2d16c4-4e94-40cd-8fe6-5fbb1808dfc8' // From previous test

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select(`
      *,
      created_by:users!support_tickets_created_by_user_id_fkey(id, full_name, email)
    `)
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    console.error('❌ Ticket not found:', ticketError)
    console.log('\n💡 Please run test-regular-user-ticket.mjs first to create a ticket')
    process.exit(1)
  }

  console.log(`✅ Ticket: ${ticket.subject}`)
  console.log(`   Created by: ${ticket.created_by.full_name} (${ticket.created_by.email})`)
  console.log(`   Ticket ID: ${ticket.id}\n`)

  // 2. Get admin user
  const { data: admin, error: adminError } = await supabase
    .from('users')
    .select('id, full_name, email')
    .eq('email', 'munong2@gmail.com')
    .single()

  if (adminError || !admin) {
    console.error('❌ Admin not found:', adminError)
    process.exit(1)
  }

  console.log(`✅ Admin: ${admin.full_name} (${admin.email})\n`)

  // 3. Admin creates a reply
  console.log('💬 Admin creating reply...')
  const { data: reply, error: replyError } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticket.id,
      user_id: admin.id,
      message: '안녕하세요! 관리자입니다. 문의 주신 내용 확인했습니다. 곧 처리해드리겠습니다.',
      is_internal_note: false,
    })
    .select()
    .single()

  if (replyError) {
    console.error('❌ Failed to create reply:', replyError)
    process.exit(1)
  }

  console.log(`✅ Reply created: ${reply.message.substring(0, 50)}...`)
  console.log(`   Reply ID: ${reply.id}\n`)

  // 4. Wait for trigger
  console.log('⏳ Waiting for trigger to execute (2 seconds)...')
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // 5. Check if user received notification
  console.log('🔍 Checking user notifications...\n')

  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', ticket.created_by.id)
    .eq('type', 'support_reply')
    .order('created_at', { ascending: false })
    .limit(1)

  if (notifError) {
    console.error('❌ Failed to fetch notifications:', notifError)
    process.exit(1)
  }

  if (notifications.length > 0) {
    const notif = notifications[0]
    console.log(`✅ User received notification:`)
    console.log(`   - Title: ${notif.title}`)
    console.log(`   - Message: ${notif.message}`)
    console.log(`   - Created: ${notif.created_at}`)
    console.log(`   - Metadata:`, JSON.stringify(notif.metadata, null, 2))
    console.log()
    console.log(`✅ SUCCESS! User will see this in dashboard/notifications page`)
  } else {
    console.log(`❌ No notification found for user`)
    console.log('   The support_reply trigger might not be working')
  }

  console.log('\n💡 Test reply created:')
  console.log(`   Reply ID: ${reply.id}`)
  console.log(`   Ticket: /dashboard/support/${ticket.id}`)
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
