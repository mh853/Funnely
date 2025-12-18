#!/usr/bin/env node

/**
 * Apply subscription notification migration to remote database
 * Executes: 20251218000000_enable_subscriptions_realtime.sql
 */

import fs from 'fs'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗')
  console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓' : '✗')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('📋 Reading migration file...')

  const migrationPath = 'supabase/migrations/20251218000000_enable_subscriptions_realtime.sql'
  const sql = fs.readFileSync(migrationPath, 'utf8')

  console.log('🚀 Applying migration to remote database...\n')

  try {
    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // If exec_sql doesn't exist, try executing statements individually
      console.log('⚠️  exec_sql not available, executing statements individually...\n')

      // Split SQL into statements and execute
      const statements = sql
        .split(';')
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'))

      for (const statement of statements) {
        if (statement.includes('ALTER PUBLICATION')) {
          console.log('📡 Enabling Realtime on company_subscriptions...')
          const { error: realtimeError } = await supabase.rpc('query', {
            query: statement
          })
          if (realtimeError) {
            console.log('   Note:', realtimeError.message)
          } else {
            console.log('   ✓ Realtime enabled')
          }
        } else if (statement.includes('CREATE OR REPLACE FUNCTION')) {
          console.log('🔧 Creating notification function...')
          // Function creation requires raw SQL execution
          console.log('   ⚠️  Manual execution required via Supabase Dashboard')
        } else if (statement.includes('CREATE TRIGGER')) {
          console.log('⚡ Creating trigger...')
          console.log('   ⚠️  Manual execution required via Supabase Dashboard')
        }
      }
    } else {
      console.log('✅ Migration applied successfully!\n')
    }

    // Verify the trigger exists
    console.log('🔍 Verifying trigger installation...')
    const { data: triggers, error: triggerError } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .eq('tgname', 'on_subscription_change')

    if (triggerError) {
      console.log('⚠️  Could not verify trigger (may need manual check)')
      console.log('   Error:', triggerError.message)
    } else if (triggers && triggers.length > 0) {
      console.log('✅ Trigger on_subscription_change exists')
    } else {
      console.log('❌ Trigger not found - manual application required')
      console.log('\n📝 Manual steps:')
      console.log('1. Go to Supabase Dashboard > SQL Editor')
      console.log('2. Paste the contents of:')
      console.log('   supabase/migrations/20251218000000_enable_subscriptions_realtime.sql')
      console.log('3. Execute the SQL')
    }

    // Test notification creation
    console.log('\n🧪 Testing notification system...')
    console.log('Creating a test notification to verify system is working...')

    const { data: testNotif, error: notifError } = await supabase
      .from('notifications')
      .insert({
        company_id: '00000000-0000-0000-0000-000000000000',
        title: 'System Test - Subscription Notifications',
        message: '구독 알림 시스템이 정상적으로 작동하고 있습니다. (테스트 메시지)',
        type: 'subscription_started',
        is_read: false,
      })
      .select()

    if (notifError) {
      console.log('❌ Test notification failed:', notifError.message)
    } else {
      console.log('✅ Test notification created successfully')
      console.log('   Admin notification center should now show this test message')
    }

  } catch (err) {
    console.error('❌ Error applying migration:', err.message)
    process.exit(1)
  }
}

applyMigration()
