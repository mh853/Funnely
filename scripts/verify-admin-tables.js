const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkTables() {
  const tables = [
    'customer_health_scores',
    'onboarding_progress',
    'feature_usage_tracking',
    'revenue_metrics',
    'churn_records',
    'automation_workflows',
    'bulk_operations',
    'audit_logs',
    'admin_roles',
    'admin_role_assignments',
    'privacy_requests',
    'announcements',
    'in_app_messages',
    'email_templates'
  ];

  console.log('🔍 Checking admin enhancement tables...\n');

  let existCount = 0;
  let missingCount = 0;

  for (const table of tables) {
    const { error } = await supabase.from(table).select('*').limit(0);

    if (error) {
      console.log('❌', table, '- Does not exist');
      missingCount++;
    } else {
      console.log('✅', table, '- Exists');
      existCount++;
    }
  }

  console.log('\n📊 Summary:');
  console.log(`✅ Existing tables: ${existCount}/${tables.length}`);
  console.log(`❌ Missing tables: ${missingCount}/${tables.length}`);

  // Also check admin_roles seed data
  if (existCount > 0) {
    console.log('\n🔍 Checking admin_roles seed data...');
    const { data: roles, error: rolesError } = await supabase
      .from('admin_roles')
      .select('*');

    if (!rolesError && roles) {
      console.log(`✅ Found ${roles.length} admin roles:`);
      roles.forEach(role => {
        console.log(`   - ${role.code}: ${role.name}`);
      });
    }
  }

  return missingCount === 0;
}

checkTables()
  .then(success => {
    if (success) {
      console.log('\n🎉 All admin enhancement tables verified successfully!');
      process.exit(0);
    } else {
      console.log('\n⚠️  Some tables are missing. Migration may need to be applied.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  });
