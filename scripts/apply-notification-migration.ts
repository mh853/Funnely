import { createClient } from '@supabase/supabase-js'
import fs from 'fs'
import path from 'path'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('Reading migration file...')

  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/20250105000000_create_lead_notification_system.sql'
  )

  const migrationSQL = fs.readFileSync(migrationPath, 'utf-8')

  console.log('Applying migration to production database...')

  try {
    // Execute the migration SQL
    const { error } = await supabase.rpc('exec_sql', {
      sql: migrationSQL,
    })

    if (error) {
      console.error('Migration failed:', error)
      process.exit(1)
    }

    console.log('✅ Migration applied successfully!')
  } catch (error) {
    console.error('Migration error:', error)
    process.exit(1)
  }
}

applyMigration()
