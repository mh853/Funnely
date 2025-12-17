// Apply last_login tracking migration
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
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

async function applyMigration() {
  console.log('🔐 Applying last_login tracking migration...\n');

  try {
    // Read migration file
    const migration = readFileSync(
      resolve(__dirname, '../supabase/migrations/20251217000012_track_last_login.sql'),
      'utf-8'
    );

    // Execute migration
    const { error } = await supabase.rpc('exec_sql', { sql: migration });

    if (error) {
      console.error('❌ Migration failed:', error);
      return;
    }

    console.log('✅ Migration applied successfully!\n');

    // Verify results
    console.log('📊 Checking users with last_login data...\n');

    const { data: users, error: queryError } = await supabase
      .from('users')
      .select('email, last_login')
      .not('last_login', 'is', null)
      .order('last_login', { ascending: false })
      .limit(10);

    if (queryError) {
      console.error('❌ Query failed:', queryError);
      return;
    }

    if (users && users.length > 0) {
      console.log('👥 Users with last_login values:');
      users.forEach(user => {
        console.log(`  - ${user.email}: ${user.last_login}`);
      });
    } else {
      console.log('⚠️  No users have last_login data yet.');
      console.log('💡 Last login will be tracked automatically on next sign-in.\n');
    }

    console.log('\n✅ Done! Last login tracking is now enabled.');
    console.log('💡 Users\' last_login will be updated automatically on their next sign-in.');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

applyMigration();
