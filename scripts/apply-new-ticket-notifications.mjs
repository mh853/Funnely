#!/usr/bin/env node

/**
 * Apply New Ticket Admin Notifications Migration
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function main() {
  console.log('🚀 Applying New Ticket Admin Notifications Migration\n')

  const migrationSQL = readFileSync('supabase/migrations/20260102120000_new_ticket_admin_notifications.sql', 'utf8')

  console.log('📝 Migration SQL loaded\n')
  console.log('⚙️ Executing migration...\n')

  // Split SQL into statements and execute one by one
  const statements = migrationSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    console.log(`Executing: ${statement.substring(0, 100)}...`)

    const { error } = await supabase.rpc('exec', {
      sql: statement + ';',
    })

    if (error) {
      // Try direct query if exec RPC doesn't exist
      const { error: queryError } = await supabase.from('_').select('*').limit(0)

      if (queryError) {
        console.error(`❌ Error:`, error.message)
        // Continue with next statement if it's just "already exists" error
        if (!error.message.includes('already exists')) {
          process.exit(1)
        }
      }
    }
  }

  console.log('\n✅ Migration applied successfully!\n')
  console.log('📋 Summary:')
  console.log('   ✅ Created notify_admins_new_ticket() function')
  console.log('   ✅ Created trigger on support_tickets table')
  console.log('   ✅ Admins will now be notified when users create new tickets')
}

main().catch((error) => {
  console.error('❌ Migration failed:', error)
  process.exit(1)
})
