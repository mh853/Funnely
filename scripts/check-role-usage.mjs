// Check which roles are actually used in the system
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

async function checkRoleUsage() {
  console.log('🔍 Checking actual role usage in database...\n');

  // Check all users and their roles
  const { data: users } = await supabase
    .from('users')
    .select('id, email, full_name, role')
    .order('role');

  console.log('📊 Role distribution in users table:');
  const roleCounts = {};
  users?.forEach(user => {
    const role = user.role || 'NULL';
    roleCounts[role] = (roleCounts[role] || 0) + 1;
  });

  Object.entries(roleCounts).forEach(([role, count]) => {
    console.log(`  ${role}: ${count} users`);
  });

  console.log('\n📋 User details by role:');
  users?.forEach(user => {
    console.log(`  - ${user.email}: ${user.role || 'NULL'}`);
  });

  console.log('\n\n💡 Recommendation:');
  const uniqueRoles = Object.keys(roleCounts).filter(r => r !== 'NULL');
  console.log(`  Currently using ${uniqueRoles.length} different roles: ${uniqueRoles.join(', ')}`);
  console.log('  Should simplify to 3 roles: admin (관리자), manager (매니저), user (일반 사용자)');
}

checkRoleUsage();
