#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('🚀 Applying Support Reply Notifications Migration\n')

  // Step 1: Add user_id column
  console.log('1️⃣ Adding user_id column...')
  let { error } = await supabase.rpc('exec_sql', {
    sql: 'ALTER TABLE notifications ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;',
  })
  if (error && error.message !== 'function exec_sql() does not exist') {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Done\n')
  }

  // Step 2: Add metadata column
  console.log('2️⃣ Adding metadata column...')
  ;({ error } = await supabase.rpc('exec_sql', {
    sql: "ALTER TABLE notifications ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb;",
  }))
  if (error && error.message !== 'function exec_sql() does not exist') {
    console.error('❌ Error:', error)
  } else {
    console.log('✅ Done\n')
  }

  console.log('⚠️ Note: exec_sql RPC function may not be available.')
  console.log('Please manually execute the migration file in Supabase Dashboard:')
  console.log('supabase/migrations/20260102000000_support_reply_notifications.sql')
}

applyMigration()
