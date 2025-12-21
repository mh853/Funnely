const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')
const path = require('path')
require('dotenv').config({ path: path.join(__dirname, '../.env.local') })

async function applyGrowthOpportunitiesMigration() {
  console.log('🚀 Applying growth_opportunities table migration...\n')

  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing environment variables!')
    console.error('Requires: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY')
    process.exit(1)
  }

  // Create Supabase client with service role
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  // Read SQL file
  const sqlPath = path.join(__dirname, 'apply-growth-opportunities.sql')
  const sql = fs.readFileSync(sqlPath, 'utf8')

  console.log('📄 Executing SQL migration...')
  console.log('─'.repeat(50))

  try {
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql })

    if (error) {
      // Try direct execution if rpc doesn't work
      console.log('⚠️  RPC method failed, trying direct execution...')

      const { data: result, error: execError } = await supabase
        .from('_realtime')
        .select('*')
        .limit(0)

      // Since we can't execute raw SQL directly via JS client,
      // we need to use the REST API
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/rpc/exec_sql`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
          },
          body: JSON.stringify({ sql_query: sql })
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      console.log('✅ Migration applied successfully!')
    } else {
      console.log('✅ Migration applied successfully!')
      if (data) {
        console.log('Result:', data)
      }
    }

    // Verify the table exists
    console.log('\n🔍 Verifying table creation...')
    const { data: tableCheck, error: checkError } = await supabase
      .from('growth_opportunities')
      .select('*')
      .limit(0)

    if (checkError) {
      console.error('❌ Table verification failed:', checkError.message)
      process.exit(1)
    }

    console.log('✅ Table verified successfully!')
    console.log('\n🎉 Growth opportunities migration complete!')

  } catch (error) {
    console.error('❌ Migration failed:', error.message)
    console.error('\n📋 Please apply the migration manually:')
    console.error('1. Open Supabase Dashboard SQL Editor')
    console.error('2. Copy contents from: scripts/apply-growth-opportunities.sql')
    console.error('3. Execute the SQL')
    process.exit(1)
  }
}

applyGrowthOpportunitiesMigration()
