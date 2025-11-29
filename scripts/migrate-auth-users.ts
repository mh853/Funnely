/**
 * Migration Script: Auth Users to Public Users Table
 *
 * This script migrates users from Supabase Auth to the public.users table
 * Creates corresponding hospital records if they don't exist
 *
 * Usage: npx tsx scripts/migrate-auth-users.ts
 */

import { createClient } from '@supabase/supabase-js'
import { config } from 'dotenv'
import { resolve } from 'path'

// Load environment variables
config({ path: resolve(__dirname, '../.env.local') })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Error: Missing environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

interface MigrationResult {
  total: number
  migrated: number
  skipped: number
  failed: number
  errors: Array<{ userId: string; email: string; error: string }>
}

async function migrateAuthUsers(): Promise<MigrationResult> {
  const result: MigrationResult = {
    total: 0,
    migrated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  }

  console.log('🚀 Starting migration...\n')

  try {
    // 1. Get all users from Supabase Auth
    console.log('📋 Fetching users from Supabase Auth...')
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers()

    if (authError) {
      throw new Error(`Failed to fetch auth users: ${authError.message}`)
    }

    if (!authUsers || authUsers.users.length === 0) {
      console.log('ℹ️  No users found in Supabase Auth')
      return result
    }

    result.total = authUsers.users.length
    console.log(`✅ Found ${result.total} users in Supabase Auth\n`)

    // 2. Get existing users from public.users table
    console.log('📋 Fetching existing users from public.users table...')
    const { data: existingUsers, error: existingError } = await supabase
      .from('users')
      .select('id, email')

    if (existingError) {
      throw new Error(`Failed to fetch existing users: ${existingError.message}`)
    }

    const existingUserIds = new Set(existingUsers?.map(u => u.id) || [])
    console.log(`✅ Found ${existingUserIds.size} existing users in public.users table\n`)

    // 3. Process each auth user
    console.log('🔄 Processing users...\n')
    for (const authUser of authUsers.users) {
      const email = authUser.email || 'no-email@example.com'
      const fullName = authUser.user_metadata?.full_name || authUser.email?.split('@')[0] || 'User'

      console.log(`👤 Processing: ${email} (ID: ${authUser.id})`)

      // Skip if user already exists in public.users
      if (existingUserIds.has(authUser.id)) {
        console.log(`   ⏭️  Already exists in public.users - skipping\n`)
        result.skipped++
        continue
      }

      try {
        // Create hospital for this user
        console.log(`   🏥 Creating hospital...`)
        const tempBusinessNumber = `TEMP-${Date.now()}-${Math.random().toString(36).substring(7)}`

        const { data: hospital, error: hospitalError } = await supabase
          .from('companies')
          .insert({
            name: `${fullName}의 회사`,
            business_number: tempBusinessNumber,
          })
          .select()
          .single()

        if (hospitalError) {
          throw new Error(`Failed to create hospital: ${hospitalError.message}`)
        }

        console.log(`   ✅ Company created (ID: ${hospital.id})`)

        // Create user in public.users
        console.log(`   👤 Creating user record...`)
        const { error: userError } = await supabase.from('users').insert({
          id: authUser.id,
          company_id: hospital.id,
          email: email,
          full_name: fullName,
          role: 'hospital_owner',
          is_active: true,
        })

        if (userError) {
          // Rollback: delete hospital
          await supabase.from('companies').delete().eq('id', hospital.id)
          throw new Error(`Failed to create user: ${userError.message}`)
        }

        console.log(`   ✅ User record created`)
        console.log(`   🎉 Migration successful!\n`)
        result.migrated++
      } catch (error: any) {
        console.log(`   ❌ Migration failed: ${error.message}\n`)
        result.failed++
        result.errors.push({
          userId: authUser.id,
          email: email,
          error: error.message,
        })
      }
    }

    return result
  } catch (error: any) {
    console.error('❌ Migration failed:', error.message)
    throw error
  }
}

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Auth Users to Public Users Migration Script')
  console.log('═══════════════════════════════════════════════════════\n')

  try {
    const result = await migrateAuthUsers()

    console.log('═══════════════════════════════════════════════════════')
    console.log('  Migration Complete!')
    console.log('═══════════════════════════════════════════════════════')
    console.log(`Total users:     ${result.total}`)
    console.log(`Migrated:        ${result.migrated}`)
    console.log(`Skipped:         ${result.skipped}`)
    console.log(`Failed:          ${result.failed}`)
    console.log('═══════════════════════════════════════════════════════')

    if (result.errors.length > 0) {
      console.log('\n❌ Errors:')
      result.errors.forEach(({ email, error }) => {
        console.log(`   ${email}: ${error}`)
      })
    }

    if (result.failed > 0) {
      process.exit(1)
    }
  } catch (error: any) {
    console.error('\n❌ Fatal error:', error.message)
    process.exit(1)
  }
}

main()
