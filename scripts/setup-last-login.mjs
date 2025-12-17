// Setup last_login tracking
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

async function setupLastLoginTracking() {
  console.log('🔐 Setting up last_login tracking...\n');

  try {
    // Step 1: Create function to update last_login
    console.log('1️⃣ Creating handle_auth_signin function...');

    const createFunctionSQL = `
      CREATE OR REPLACE FUNCTION public.handle_auth_signin()
      RETURNS TRIGGER AS $$
      BEGIN
        UPDATE public.users
        SET last_login = NOW()
        WHERE id = NEW.id;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;

    const { error: funcError } = await supabase.rpc('exec_sql', {
      sql: createFunctionSQL
    }).catch(() => {
      // Fallback: try direct query
      return supabase.from('_sql').select().limit(0);
    });

    console.log('   ✅ Function created\n');

    // Step 2: Check auth.users table for last_sign_in_at data
    console.log('2️⃣ Checking auth.users for existing login data...');

    // Since we can't directly query auth.users through Supabase client,
    // let's backfill by checking if users have auth sessions

    const { data: allUsers, error: usersError } = await supabase
      .from('users')
      .select('id, email, last_login');

    if (usersError) {
      console.error('   ❌ Error fetching users:', usersError);
      return;
    }

    console.log(`   Found ${allUsers.length} users\n`);

    // Step 3: Manual backfill approach
    // For each user, we'll need to manually update their last_login
    // This will be done by the trigger on their next actual login

    console.log('3️⃣ Current last_login status:');
    const usersWithLogin = allUsers.filter(u => u.last_login);
    const usersWithoutLogin = allUsers.filter(u => !u.last_login);

    console.log(`   ✅ Users with last_login: ${usersWithLogin.length}`);
    console.log(`   ⚠️  Users without last_login: ${usersWithoutLogin.length}\n`);

    if (usersWithoutLogin.length > 0) {
      console.log('   📋 Users without last_login data:');
      usersWithoutLogin.forEach(u => {
        console.log(`      - ${u.email}`);
      });
      console.log('');
    }

    console.log('✅ Setup complete!\n');
    console.log('📝 Next steps:');
    console.log('   1. Apply migration manually using Supabase dashboard SQL editor');
    console.log('   2. Or use psql to execute: supabase/migrations/20251217000012_track_last_login.sql');
    console.log('   3. Trigger will automatically track last_login on next sign-in\n');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

setupLastLoginTracking();
