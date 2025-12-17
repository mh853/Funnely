// Check actual user roles from database
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkActualRoles() {
  console.log('🔍 Checking actual user roles from database...\n');

  const targetEmails = ['munong2@gmail.com', 'mhc853@gmail.com'];

  for (const email of targetEmails) {
    console.log(`\n📧 ${email}:`);

    const { data: user } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (!user) {
      console.log('  ❌ User not found');
      continue;
    }

    console.log(`  User ID: ${user.id}`);
    console.log(`  Full Name: ${user.full_name}`);
    console.log(`  Company ID: ${user.company_id}`);
    console.log(`  Is Super Admin: ${user.is_super_admin}`);

    // Check if users table has a role column
    if ('role' in user) {
      console.log(`  📋 User Role (from users table): ${user.role || 'NULL'}`);
    }

    // Check admin_role_assignments
    const { data: adminRoles } = await supabase
      .from('admin_role_assignments')
      .select('admin_roles(id, name, code)')
      .eq('user_id', user.id);

    console.log(`  🔐 Admin Role Assignments: ${adminRoles?.length || 0}`);
    if (adminRoles && adminRoles.length > 0) {
      adminRoles.forEach(ra => {
        console.log(`    - ${ra.admin_roles?.name} (${ra.admin_roles?.code})`);
      });
    }

    // Check company
    if (user.company_id) {
      const { data: company } = await supabase
        .from('companies')
        .select('id, name')
        .eq('id', user.company_id)
        .single();

      console.log(`  🏢 Company: ${company?.name}`);
    }
  }

  // Check users table schema
  console.log('\n\n📋 Checking users table columns...');
  const { data: sampleUser } = await supabase
    .from('users')
    .select('*')
    .limit(1)
    .single();

  if (sampleUser) {
    console.log('Available columns:', Object.keys(sampleUser).join(', '));
  }
}

checkActualRoles();
