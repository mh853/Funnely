#!/usr/bin/env node

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const migrationPath = path.join(__dirname, '../supabase/migrations/20251216000000_admin_enhancement_schema.sql');
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL not found in environment variables');
  console.error('');
  console.error('Please apply the migration manually:');
  console.error('');
  console.error('1. Go to: https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql/new');
  console.error('2. Copy contents of: supabase/migrations/20251216000000_admin_enhancement_schema.sql');
  console.error('3. Paste and execute in SQL editor');
  process.exit(1);
}

console.log('📁 Reading migration file...');
const sql = fs.readFileSync(migrationPath, 'utf8');
console.log(`✅ Loaded migration (${(sql.length / 1024).toFixed(1)} KB)`);
console.log('');

// Check if psql is available
exec('which psql', (error) => {
  if (error) {
    console.log('⚠️  psql command not found.');
    console.log('');
    console.log('📋 Please apply the migration manually via Supabase Dashboard:');
    console.log('');
    console.log('1. Go to: https://supabase.com/dashboard/project/wsrjfdnxsggwymlrfqcc/sql/new');
    console.log('2. Open file: supabase/migrations/20251216000000_admin_enhancement_schema.sql');
    console.log('3. Copy and paste the entire SQL content');
    console.log('4. Click "Run" to execute');
    console.log('');
    console.log('After applying, run: node scripts/verify-admin-tables.js');
    return;
  }

  console.log('🚀 Executing migration with psql...');
  console.log('');

  const psqlCommand = `psql "${DATABASE_URL}" -f "${migrationPath}"`;

  exec(psqlCommand, (error, stdout, stderr) => {
    if (error) {
      console.error('❌ Migration failed:');
      console.error(stderr || error.message);
      console.log('');
      console.log('Please try applying manually via Supabase Dashboard (see above)');
      process.exit(1);
    }

    console.log(stdout);
    if (stderr && !stderr.includes('NOTICE')) {
      console.error(stderr);
    }

    console.log('');
    console.log('✅ Migration applied successfully!');
    console.log('');
    console.log('🔍 Verifying tables...');

    exec('node scripts/verify-admin-tables.js', (verifyError, verifyStdout) => {
      console.log(verifyStdout);
      if (verifyError) {
        console.log('⚠️  Verification had issues, but migration may have succeeded');
      }
    });
  });
});
