#!/usr/bin/env node

/**
 * Check users in the system
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function main() {
  console.log('👥 Checking users in the system...\n')

  // Get all users
  const { data: users, error } = await supabase
    .from('users')
    .select('id, full_name, email, company_id, is_super_admin')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('❌ Error fetching users:', error)
    process.exit(1)
  }

  console.log(`Found ${users.length} users:\n`)

  // Group by company
  const companies = {}
  users.forEach((user) => {
    if (!companies[user.company_id]) {
      companies[user.company_id] = []
    }
    companies[user.company_id].push(user)
  })

  // Display by company
  Object.entries(companies).forEach(([companyId, companyUsers]) => {
    console.log(`\n📦 Company: ${companyId}`)
    console.log(`   Users: ${companyUsers.length}`)

    const admins = companyUsers.filter((u) => u.is_super_admin)
    const regularUsers = companyUsers.filter((u) => !u.is_super_admin)

    if (admins.length > 0) {
      console.log('\n   👑 Admins:')
      admins.forEach((admin) => {
        console.log(`      - ${admin.full_name} (${admin.email})`)
        console.log(`        ID: ${admin.id}`)
      })
    }

    if (regularUsers.length > 0) {
      console.log('\n   👤 Regular Users:')
      regularUsers.forEach((user) => {
        console.log(`      - ${user.full_name} (${user.email})`)
        console.log(`        ID: ${user.id}`)
      })
    } else {
      console.log('\n   ⚠️ No regular users in this company')
    }
  })

  console.log('\n\n💡 For testing:')
  console.log('   - A REGULAR USER must create a ticket')
  console.log('   - The trigger will then notify ADMINS in the same company')
  console.log('   - If an ADMIN creates a ticket, they will NOT be notified (by design)')
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
