#!/usr/bin/env node

/**
 * Check notifications data in database
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function checkNotifications() {
  console.log('🔍 Checking notifications data...\n')

  // Check total notifications
  const { count, error: countError } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })

  if (countError) {
    console.error('❌ Error counting notifications:', countError)
    return
  }

  console.log(`📊 Total notifications: ${count}`)

  // Check unread notifications
  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  console.log(`📬 Unread notifications: ${unreadCount}`)

  // Get sample notifications
  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)

  if (error) {
    console.error('❌ Error fetching notifications:', error)
    return
  }

  console.log(`\n📋 Sample notifications (latest 5):`)
  notifications?.forEach((n, idx) => {
    console.log(`\n${idx + 1}. ${n.title}`)
    console.log(`   Type: ${n.type}`)
    console.log(`   Read: ${n.is_read ? 'Yes' : 'No'}`)
    console.log(`   Created: ${n.created_at}`)
    console.log(`   Message: ${n.message.substring(0, 100)}${n.message.length > 100 ? '...' : ''}`)
  })

  // Check notifications by type
  const { data: typeStats } = await supabase
    .from('notifications')
    .select('type')

  if (typeStats) {
    const typeCounts = typeStats.reduce((acc, n) => {
      acc[n.type] = (acc[n.type] || 0) + 1
      return acc
    }, {})

    console.log(`\n📊 Notifications by type:`)
    Object.entries(typeCounts).forEach(([type, count]) => {
      console.log(`   ${type}: ${count}`)
    })
  }
}

checkNotifications().catch(console.error)
