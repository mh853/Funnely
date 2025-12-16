const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function applyMigration() {
  console.log('📁 Reading migration file...');

  const migrationPath = path.join(
    __dirname,
    '../supabase/migrations/20251216000000_admin_enhancement_schema.sql'
  );

  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('✅ Migration file loaded');
  console.log(`📏 Size: ${(sql.length / 1024).toFixed(2)} KB`);
  console.log('\n🚀 Applying migration to database...\n');

  // Split the SQL into individual statements
  // We need to execute them one by one since Supabase doesn't support multi-statement queries via JS client
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];

    // Skip comments and empty statements
    if (!stmt || stmt.startsWith('--')) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: stmt + ';' });

      if (error) {
        // Try using a different approach - direct SQL execution might not be available
        console.log(`⚠️  Statement ${i + 1}: ${error.message.substring(0, 100)}`);
        errorCount++;
      } else {
        successCount++;
        if (successCount % 10 === 0) {
          console.log(`✅ Executed ${successCount} statements...`);
        }
      }
    } catch (err) {
      console.log(`❌ Error at statement ${i + 1}:`, err.message.substring(0, 100));
      errorCount++;
    }
  }

  console.log(`\n📊 Migration Summary:`);
  console.log(`✅ Successful: ${successCount}`);
  console.log(`❌ Errors: ${errorCount}`);

  if (errorCount > 0) {
    console.log('\n⚠️  Note: Supabase JS client may not support all SQL operations.');
    console.log('Please apply the migration manually via Supabase Dashboard SQL Editor:');
    console.log('1. Go to: https://supabase.com/dashboard/project/[your-project]/sql/new');
    console.log('2. Copy the contents of: supabase/migrations/20251216000000_admin_enhancement_schema.sql');
    console.log('3. Execute the SQL');
  }
}

applyMigration()
  .then(() => {
    console.log('\n✅ Migration process completed');
  })
  .catch(error => {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  });
