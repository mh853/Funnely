#!/usr/bin/env node

/**
 * Check if new ticket notification trigger exists
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
  console.log('🔍 Checking if trigger and function exist...\n')

  // Check if function exists
  const { data: functions, error: funcError } = await supabase.rpc('exec_sql', {
    query: `
      SELECT proname, prosrc
      FROM pg_proc
      WHERE proname = 'notify_admins_new_ticket';
    `,
  })

  if (funcError) {
    console.log('⚠️ Cannot check function (exec_sql RPC not available)')
    console.log('   Trying alternative method...\n')

    // Try to manually create a test ticket and see if notification is created
    const { data: testTicket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id')
      .limit(1)
      .single()

    if (ticketError) {
      console.error('❌ Cannot access support_tickets table:', ticketError.message)
      return
    }

    console.log('✅ Can access support_tickets table')
    console.log(`   Found ticket: ${testTicket.id}\n`)

    // Check if any notifications exist
    const { data: notifications, error: notifError } = await supabase
      .from('notifications')
      .select('*')
      .eq('type', 'new_support_ticket')
      .limit(5)

    if (notifError) {
      console.error('❌ Cannot access notifications table:', notifError.message)
      return
    }

    console.log(`📬 Found ${notifications.length} new_support_ticket notifications`)
    if (notifications.length > 0) {
      console.log('   Latest notification:')
      console.log(`   - Created: ${notifications[0].created_at}`)
      console.log(`   - User ID: ${notifications[0].user_id}`)
      console.log(`   - Title: ${notifications[0].title}`)
    }

    console.log('\n💡 Recommendation:')
    console.log('   The trigger might not be installed yet.')
    console.log('   Please run the migration SQL directly in Supabase Dashboard SQL Editor:')
    console.log('   supabase/migrations/20260102120000_new_ticket_admin_notifications.sql')
    return
  }

  if (functions && functions.length > 0) {
    console.log('✅ Function exists: notify_admins_new_ticket')
  } else {
    console.log('❌ Function NOT found: notify_admins_new_ticket')
    console.log('\n💡 Please run the migration in Supabase Dashboard SQL Editor')
  }
}

main().catch((error) => {
  console.error('❌ Error:', error.message)
  process.exit(1)
})
