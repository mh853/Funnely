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

async function applyMigration() {
  console.log('📦 Applying Lead Notification System Migration...\n')

  const migrationPath = join(__dirname, '../supabase/migrations/20250105000000_create_lead_notification_system.sql')

  console.log('Reading migration file:', migrationPath)
  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  // Split SQL into individual statements (basic splitting by semicolon)
  const statements = migrationSQL
    .split(';')
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'))

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]

    // Skip comment-only statements
    if (statement.startsWith('COMMENT ON')) {
      console.log(`[${i + 1}/${statements.length}] Executing comment statement...`)
    } else {
      console.log(`[${i + 1}/${statements.length}] Executing statement...`)
    }

    try {
      // Use Supabase's SQL execution (this requires proper permissions)
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          apikey: supabaseServiceKey,
          Authorization: `Bearer ${supabaseServiceKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: statement + ';' }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`   ❌ Failed: ${error.substring(0, 100)}`)
        errorCount++
      } else {
        console.log(`   ✅ Success`)
        successCount++
      }
    } catch (error) {
      console.error(`   ❌ Error:`, error.message)
      errorCount++
    }
  }

  console.log(`\n📊 Migration Summary:`)
  console.log(`   ✅ Success: ${successCount}`)
  console.log(`   ❌ Failed: ${errorCount}`)

  if (errorCount === 0) {
    console.log('\n🎉 Migration completed successfully!')
  } else {
    console.log('\n⚠️  Some statements failed. You may need to apply the migration manually.')
    console.log('   Alternative: Use Supabase Dashboard SQL Editor to run the migration file.')
  }
}

applyMigration().catch(console.error)
