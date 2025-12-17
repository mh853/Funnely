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

  // 2. Check leads table structure
  console.log('\n🔍 Checking leads table structure...');
  const { data: sampleLeads, error: leadsStructureError } = await supabase
    .from('leads')
    .select('*')
    .limit(3);

  if (leadsStructureError) {
    console.error('❌ Error fetching leads structure:', leadsStructureError);
  } else if (sampleLeads && sampleLeads.length > 0) {
    console.log(`✅ Found ${sampleLeads.length} sample leads`);
    console.log('📋 Lead columns:', Object.keys(sampleLeads[0]).join(', '));
    console.log('\n📋 Sample lead data:');
    sampleLeads.forEach((lead, idx) => {
      console.log(`\nLead ${idx + 1}:`);
      console.log(`  - ID: ${lead.id}`);
      console.log(`  - Company ID: ${lead.company_id || 'NULL'}`);
      console.log(`  - Landing Page ID: ${lead.landing_page_id || 'NULL'}`);
      console.log(`  - Name: ${lead.name || 'NULL'}`);
      console.log(`  - Created At: ${lead.created_at}`);
    });
  } else {
    console.log('⚠️  No leads found in database');
  }

  // 3. Check leads count by company
  if (users && users.length > 0) {
    console.log('\n🔍 Checking leads count by company...');
    for (const user of users.slice(0, 3)) {
      const { count: leadsCount } = await supabase
        .from('leads')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', user.company_id);

      console.log(`  - ${user.email} (Company: ${user.company_id?.slice(0, 8)}...): ${leadsCount || 0} leads`);
    }
  }

  // 4. Check landing pages
  if (users && users.length > 0) {
    console.log('\n🔍 Checking landing pages by user...');
    for (const user of users.slice(0, 3)) {
      const { count: pagesCount } = await supabase
        .from('landing_pages')
        .select('id', { count: 'exact', head: true })
        .eq('created_by', user.id);

      console.log(`  - ${user.email}: ${pagesCount || 0} landing pages`);
    }
  }

  // 5. Check user roles and companies
  console.log('\n👥 Checking Admin Users Table Data Accuracy...');
  for (const user of users) {
    console.log(`\n📋 ${user.email}:`);

    // Check company
    if (user.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', user.company_id)
        .single();

      console.log(`  ✅ Company: ${company?.name || 'ERROR: Company not found'}`);
    } else {
      console.log(`  ⚠️  Company: NULL`);
    }

    // Check role
    const { data: roleAssignments } = await supabase
      .from('admin_role_assignments')
      .select('role_id, admin_roles(id, name, code)')
      .eq('user_id', user.id);

    if (roleAssignments && roleAssignments.length > 0) {
      const roles = roleAssignments.map(ra => ra.admin_roles?.name || 'Unknown').join(', ');
      console.log(`  ✅ Role: ${roles}`);
    } else {
      console.log(`  ✅ Role: user (일반 사용자 - admin_role_assignments 없음)`);
    }

    // Check status
    console.log(`  ✅ Status: ${user.is_active ? '활성' : '비활성'}`);

    // Check last login
    if (user.last_login) {
      console.log(`  ✅ Last Login: ${user.last_login}`);
    } else {
      console.log(`  ✅ Last Login: NULL (로그인 기록 없음)`);
    }
  }

  // 6. Check all users' is_active status
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

  // 7. Check last_login values
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
