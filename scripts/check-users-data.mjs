// Check actual users data in database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkUsersData() {
  console.log('🔍 Checking users data in database...\n');

  // 1. Check users table structure and sample data
  const { data: users, error } = await supabase
    .from('users')
    .select('id, email, full_name, company_id, is_active, created_at, last_login')
    .limit(5);

  if (error) {
    console.error('❌ Error fetching users:', error);
    return;
  }

  console.log(`✅ Found ${users?.length || 0} users\n`);

  users?.forEach((user, idx) => {
    console.log(`📋 User ${idx + 1}:`);
    console.log(`  - ID: ${user.id}`);
    console.log(`  - Email: ${user.email}`);
    console.log(`  - Full Name: ${user.full_name || 'NULL'}`);
    console.log(`  - Company ID: ${user.company_id || 'NULL'}`);
    console.log(`  - Is Active: ${user.is_active}`);
    console.log(`  - Last Login: ${user.last_login || 'NULL'}`);
    console.log(`  - Created At: ${user.created_at}\n`);
  });

  // 2. Check if users have any leads
  if (users && users.length > 0) {
    const userId = users[0].id;
    console.log(`\n🔍 Checking leads for user ${userId}...`);

    const { count: leadsCount, error: leadsError } = await supabase
      .from('leads')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (leadsError) {
      console.error('❌ Error checking leads:', leadsError);
    } else {
      console.log(`  - Leads count: ${leadsCount || 0}`);
    }

    // 3. Check landing pages
    const { count: pagesCount, error: pagesError } = await supabase
      .from('landing_pages')
      .select('id', { count: 'exact', head: true })
      .eq('created_by', userId);

    if (pagesError) {
      console.error('❌ Error checking landing pages:', pagesError);
    } else {
      console.log(`  - Landing pages count: ${pagesCount || 0}`);
    }
  }

  // 4. Check all users' is_active status
  console.log('\n📊 Active status distribution:');
  const { data: allUsers } = await supabase
    .from('users')
    .select('is_active');

  if (allUsers) {
    const activeCount = allUsers.filter(u => u.is_active).length;
    const inactiveCount = allUsers.length - activeCount;
    console.log(`  - Active: ${activeCount}`);
    console.log(`  - Inactive: ${inactiveCount}`);
    console.log(`  - Total: ${allUsers.length}`);
  }

  // 5. Check last_login values
  console.log('\n📅 Last login data:');
  const { data: loginData } = await supabase
    .from('users')
    .select('email, last_login')
    .not('last_login', 'is', null)
    .limit(5);

  if (loginData && loginData.length > 0) {
    console.log(`  Users with last_login data: ${loginData.length}`);
    loginData.forEach(u => {
      console.log(`    - ${u.email}: ${u.last_login}`);
    });
  } else {
    console.log('  ⚠️  No users have last_login data!');
  }
}

checkUsersData();
