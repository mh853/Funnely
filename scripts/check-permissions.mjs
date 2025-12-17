// Check user authentication and permissions
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkPermissions() {
  try {
    console.log('🔍 Checking user permissions...\n');

    // Get all super admin users
    const { data: superAdmins, error: superAdminError } = await supabase
      .from('users')
      .select('id, email, is_super_admin')
      .eq('is_super_admin', true);

    if (superAdminError) {
      console.error('❌ Error fetching super admins:', superAdminError);
      return;
    }

    console.log(`✅ Super Admin Users: ${superAdmins?.length || 0}`);
    superAdmins?.forEach(user => {
      console.log(`  - ${user.email} (${user.id})`);
    });

    // For each super admin, check their role assignments
    for (const user of superAdmins || []) {
      console.log(`\n🔎 Checking role assignments for ${user.email}:`);

      const { data: assignments, error: assignError } = await supabase
        .from('admin_role_assignments')
        .select('id, role_id, admin_roles(name, code, permissions)')
        .eq('user_id', user.id);

      if (assignError) {
        console.error('  ❌ Error:', assignError);
        continue;
      }

      if (!assignments || assignments.length === 0) {
        console.log('  ⚠️  NO ROLE ASSIGNMENTS FOUND!');
        console.log('  → This user can access /admin pages (is_super_admin=true)');
        console.log('  → BUT will get 403 on API calls (no RBAC permissions)\n');
        console.log('  💡 Solution: Assign a role with required permissions');
      } else {
        console.log(`  ✅ Has ${assignments.length} role(s):`);
        assignments.forEach(a => {
          console.log(`    - ${a.admin_roles?.name} (${a.admin_roles?.code})`);
          console.log(`      Permissions: ${JSON.stringify(a.admin_roles?.permissions)}`);
        });
      }
    }

    // Check if admin_roles table has any roles
    console.log('\n📋 Available Admin Roles:');
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('id, name, code, permissions')
      .order('name');

    if (rolesError) {
      console.error('❌ Error:', rolesError);
    } else {
      console.log(`  Total roles: ${roles?.length || 0}\n`);
      roles?.forEach(role => {
        console.log(`  - ${role.name} (${role.code})`);
        console.log(`    ID: ${role.id}`);
        console.log(`    Permissions: ${JSON.stringify(role.permissions)}\n`);
      });
    }

  } catch (error) {
    console.error('❌ Unexpected error:', error);
  }
}

checkPermissions();
