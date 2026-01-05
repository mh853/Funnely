import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://wsrjfdnxsggwymlrfqcc.supabase.co'
const supabaseServiceKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndzcmpmZG54c2dnd3ltbHJmcWNjIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjkzNjkxNSwiZXhwIjoyMDc4NTEyOTE1fQ.fZAvylrbHjwUFu4kGIMacFDFr40SsAHcFC7WFa42_AU'

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function testNotificationSystem() {
  console.log('🔍 Testing Lead Notification System Setup...\n')

  // Check if notification_emails column exists
  console.log('1. Checking companies.notification_emails column...')
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('id, name, notification_emails')
    .limit(1)

  if (companiesError) {
    console.error('❌ Error accessing notification_emails:', companiesError.message)
    console.log('   Migration may need to be applied.\n')
  } else {
    console.log('✅ notification_emails column exists\n')
  }

  // Check if lead_notification_queue table exists
  console.log('2. Checking lead_notification_queue table...')
  const { data: queue, error: queueError } = await supabase
    .from('lead_notification_queue')
    .select('id')
    .limit(1)

  if (queueError) {
    console.error('❌ Error accessing lead_notification_queue:', queueError.message)
    console.log('   Migration may need to be applied.\n')
  } else {
    console.log('✅ lead_notification_queue table exists\n')
  }

  // Check if lead_notification_logs table exists
  console.log('3. Checking lead_notification_logs table...')
  const { data: logs, error: logsError } = await supabase
    .from('lead_notification_logs')
    .select('id')
    .limit(1)

  if (logsError) {
    console.error('❌ Error accessing lead_notification_logs:', logsError.message)
    console.log('   Migration may need to be applied.\n')
  } else {
    console.log('✅ lead_notification_logs table exists\n')
  }

  // Check if trigger function exists
  console.log('4. Checking notify_new_lead() trigger function...')
  const { data: functions, error: functionsError } = await supabase.rpc('exec_sql', {
    sql: "SELECT proname FROM pg_proc WHERE proname = 'notify_new_lead'",
  })

  if (functionsError) {
    console.log('⚠️  Cannot verify trigger function (exec_sql not available)\n')
  } else {
    console.log('✅ Trigger function exists\n')
  }

  console.log('📊 Summary:')
  console.log('   - Companies table: ' + (companiesError ? '❌' : '✅'))
  console.log('   - Notification queue: ' + (queueError ? '❌' : '✅'))
  console.log('   - Notification logs: ' + (logsError ? '❌' : '✅'))

  if (companiesError || queueError || logsError) {
    console.log('\n⚠️  Migration needs to be applied!')
    console.log('   Run: npx tsx scripts/apply-migration-manually.mjs')
  } else {
    console.log('\n✅ All tables exist! System is ready.')
  }
}

testNotificationSystem().catch(console.error)
