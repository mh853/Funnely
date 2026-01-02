#!/usr/bin/env node

/**
 * Apply Support Reply Notifications Migration
 *
 * This script applies the support_reply_notifications migration directly to the database
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
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
  console.log('🚀 Applying Support Reply Notifications Migration\n')

  // Read the migration file
  const migrationPath = 'supabase/migrations/20260102000000_support_reply_notifications.sql'
  console.log(`📄 Reading migration: ${migrationPath}`)

  const migrationSQL = readFileSync(migrationPath, 'utf8')

  console.log('📝 Migration SQL loaded\n')
  console.log('⚙️ Executing migration...\n')

  // Execute the migration
  const { error } = await supabase.rpc('exec_sql', { sql: migrationSQL })

  if (error) {
    // Try direct execution if RPC doesn't exist
    console.log('⚠️ RPC method not available, trying direct execution...\n')

    // Split SQL into statements and execute one by one
    const statements = migrationSQL
      .split(';')
      .map((s) => s.trim())
      .filter((s) => s.length > 0 && !s.startsWith('--'))

    for (const statement of statements) {
      const { error: execError } = await supabase.rpc('query', {
        query: statement + ';',
      })

      if (execError) {
        console.error(`❌ Error executing statement:`, execError)
        console.error('Statement:', statement.substring(0, 100) + '...')
        process.exit(1)
      }
    }
  }

  console.log('✅ Migration applied successfully!\n')
  console.log('📋 Summary of changes:')
  console.log('   ✅ Added user_id column to notifications table')
  console.log('   ✅ Added metadata column to notifications table')
  console.log('   ✅ Created index for user notifications')
  console.log('   ✅ Created trigger function for support reply notifications')
  console.log('   ✅ Created trigger on support_ticket_messages')
  console.log('   ✅ Added RLS policies for user notifications')
  console.log('   ✅ Enabled Realtime for notifications table')
}

main().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
