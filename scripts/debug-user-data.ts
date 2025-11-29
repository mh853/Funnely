/**
 * Debug Script: User Data Inspection
 *
 * This script inspects user data to diagnose login issues
 *
 * Usage: npx tsx scripts/debug-user-data.ts <email>
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
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})

async function debugUser(email: string) {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  User Data Debug Report')
  console.log('═══════════════════════════════════════════════════════\n')
  console.log(`📧 Email: ${email}\n`)

  try {
    // 1. Check Supabase Auth
    console.log('🔐 Checking Supabase Auth...')
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers?.users.find(u => u.email === email)

    if (!authUser) {
      console.log('❌ User NOT found in Supabase Auth')
      console.log('\n⚠️  This user needs to be created in Supabase Auth first\n')
      return
    }

    console.log('✅ Found in Supabase Auth')
    console.log(`   User ID: ${authUser.id}`)
    console.log(`   Email: ${authUser.email}`)
    console.log(`   Email Confirmed: ${authUser.email_confirmed_at ? 'Yes' : 'No'}`)
    console.log(`   Created: ${authUser.created_at}`)
    console.log(`   Last Sign In: ${authUser.last_sign_in_at || 'Never'}`)
    console.log(`   Metadata: ${JSON.stringify(authUser.user_metadata, null, 2)}`)

    // 2. Check public.users table
    console.log('\n👤 Checking public.users table...')
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (userError || !userData) {
      console.log('❌ User NOT found in public.users table')
      console.log(`   Error: ${userError?.message || 'No data'}`)
      console.log('\n⚠️  This is the problem! User needs to be added to public.users\n')
      return
    }

    console.log('✅ Found in public.users table')
    console.log(`   ID: ${userData.id}`)
    console.log(`   Email: ${userData.email}`)
    console.log(`   Full Name: ${userData.full_name}`)
    console.log(`   Role: ${userData.role}`)
    console.log(`   Company ID: ${userData.company_id}`)
    console.log(`   Is Active: ${userData.is_active}`)
    console.log(`   Created: ${userData.created_at}`)
    console.log(`   Last Login: ${userData.last_login || 'Never'}`)

    // 3. Check hospital
    console.log('\n🏥 Checking hospital data...')
    const { data: hospitalData, error: hospitalError } = await supabase
      .from('companies')
      .select('*')
      .eq('id', userData.company_id)
      .single()

    if (hospitalError || !hospitalData) {
      console.log('❌ Company NOT found')
      console.log(`   Error: ${hospitalError?.message || 'No data'}`)
      console.log('\n⚠️  This is the problem! Company record is missing or company_id is incorrect\n')
      return
    }

    console.log('✅ Company found')
    console.log(`   ID: ${hospitalData.id}`)
    console.log(`   Name: ${hospitalData.name}`)
    console.log(`   Business Number: ${hospitalData.business_number}`)
    console.log(`   Address: ${hospitalData.address || 'Not set'}`)
    console.log(`   Phone: ${hospitalData.phone || 'Not set'}`)
    console.log(`   Created: ${hospitalData.created_at}`)

    // 4. Test the exact query that getCachedUserProfile uses
    console.log('\n🧪 Testing getCachedUserProfile query...')
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select(`
        *,
        companies (
          id,
          name,
          business_number,
          address,
          phone
        )
      `)
      .eq('id', authUser.id)
      .single()

    if (profileError) {
      console.log('❌ getCachedUserProfile query FAILED')
      console.log(`   Error: ${profileError.message}`)
      console.log(`   Code: ${profileError.code}`)
      console.log(`   Details: ${profileError.details}`)
      console.log(`   Hint: ${profileError.hint}`)
      console.log('\n⚠️  This is why login fails! The query that the dashboard uses is failing.\n')
      return
    }

    console.log('✅ getCachedUserProfile query SUCCESS')
    console.log('   Profile data retrieved successfully')
    console.log(`   Company: ${(profileData as any).companies?.name || 'null'}`)

    // Summary
    console.log('\n═══════════════════════════════════════════════════════')
    console.log('  Summary')
    console.log('═══════════════════════════════════════════════════════')
    console.log('✅ All checks passed! This user should be able to login.')
    console.log('\nIf login still fails, check:')
    console.log('1. Browser cache and cookies')
    console.log('2. Correct password is being used')
    console.log('3. Network connectivity')
    console.log('4. Browser console for JavaScript errors')
    console.log('═══════════════════════════════════════════════════════\n')
  } catch (error: any) {
    console.error('\n❌ Unexpected error:', error.message)
    console.error('Stack:', error.stack)
  }
}

async function main() {
  const email = process.argv[2]

  if (!email) {
    console.error('Usage: npx tsx scripts/debug-user-data.ts <email>')
    console.error('Example: npx tsx scripts/debug-user-data.ts user@example.com')
    process.exit(1)
  }

  await debugUser(email)
}

main()
