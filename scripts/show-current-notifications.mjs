#!/usr/bin/env node

/**
 * Show current notifications in the database
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

async function showNotifications() {
  console.log('📋 Current Notifications in Database\n')

  const { data: notifications, error } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) {
    console.error('❌ Error:', error.message)
    return
  }

  if (!notifications || notifications.length === 0) {
    console.log('⚠️  No notifications found in database')
    return
  }

  console.log(`Found ${notifications.length} notifications:\n`)

  notifications.forEach((n, i) => {
    console.log(`${i + 1}. [${n.type}] ${n.title}`)
    console.log(`   Message: ${n.message}`)
    console.log(`   Company ID: ${n.company_id}`)
    console.log(`   Read: ${n.is_read ? '✓' : '✗'}`)
    console.log(`   Created: ${new Date(n.created_at).toLocaleString('ko-KR')}`)
    console.log('')
  })

  // Group by type
  const byType = notifications.reduce((acc, n) => {
    acc[n.type] = (acc[n.type] || 0) + 1
    return acc
  }, {})

  console.log('📊 By Type:')
  Object.entries(byType).forEach(([type, count]) => {
    console.log(`   ${type}: ${count}`)
  })
}

showNotifications()
