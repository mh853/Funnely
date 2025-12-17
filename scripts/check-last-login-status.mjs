// Check last_login status for all users
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

async function checkLastLoginStatus() {
  console.log('🔍 Checking last_login status for all users...\n');

  try {
    const { data: users, error } = await supabase
      .from('users')
      .select('id, email, full_name, last_login, created_at')
      .order('email');

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`📊 Total users: ${users.length}\n`);

    const withLogin = users.filter(u => u.last_login);
    const withoutLogin = users.filter(u => !u.last_login);

    console.log(`✅ Users WITH last_login data: ${withLogin.length}`);
    if (withLogin.length > 0) {
      withLogin.forEach(u => {
        console.log(`   - ${u.email}: ${u.last_login}`);
      });
    }

    console.log(`\n⚠️  Users WITHOUT last_login data: ${withoutLogin.length}`);
    if (withoutLogin.length > 0) {
      withoutLogin.forEach(u => {
        console.log(`   - ${u.email} (created: ${u.created_at})`);
      });
    }

    console.log('\n\n📝 ROOT CAUSE:');
    console.log('   ❌ No trigger exists to update last_login on user sign-in');
    console.log('   ❌ Login page does not manually update last_login');
    console.log('\n💡 SOLUTION:');
    console.log('   Apply migration: supabase/migrations/20251217000012_track_last_login.sql');
    console.log('   This will:');
    console.log('   1. Create trigger to auto-update last_login on signin');
    console.log('   2. Backfill existing data from auth.users.last_sign_in_at');
    console.log('\n📋 MANUAL STEPS:');
    console.log('   1. Open Supabase Dashboard → SQL Editor');
    console.log('   2. Copy contents of: supabase/migrations/20251217000012_track_last_login.sql');
    console.log('   3. Execute the SQL');
    console.log('   4. Verify trigger: SELECT * FROM information_schema.triggers WHERE trigger_name = \'on_auth_signin\';');
    console.log('   5. Users will have last_login updated on their next sign-in');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkLastLoginStatus();
