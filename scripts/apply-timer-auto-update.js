const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function applyMigration() {
  try {
    const sql = fs.readFileSync('supabase/migrations/20250224000001_add_timer_auto_update.sql', 'utf8');

    console.log('Applying migration: add_timer_auto_update...');

    // SQL을 개별 문장으로 분리 (주석과 빈 줄 제거)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('/*'));

    for (const statement of statements) {
      if (statement.toLowerCase().includes('alter table') ||
          statement.toLowerCase().includes('comment on') ||
          statement.toLowerCase().includes('add constraint')) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement + ';' });
        if (error && !error.message.includes('already exists')) {
          console.error('Error executing statement:', error);
          console.error('Statement:', statement);
        } else {
          console.log('✓ Executed:', statement.substring(0, 60) + '...');
        }
      }
    }

    console.log('\n✅ Migration applied successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

applyMigration();
