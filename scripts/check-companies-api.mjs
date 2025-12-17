// Check companies API response structure
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

async function checkCompaniesAPI() {
  console.log('🔍 Checking Companies API data structure...\n');

  try {
    // 1. Check companies table structure
    console.log('1️⃣ Companies table structure:');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .limit(3);

    if (companiesError) {
      console.error('   ❌ Error:', companiesError);
      return;
    }

    if (!companies || companies.length === 0) {
      console.log('   ⚠️  No companies found in database\n');
      return;
    }

    console.log(`   ✅ Found ${companies.length} companies`);
    console.log('   📋 Available columns:', Object.keys(companies[0]).join(', '));
    console.log('');

    // 2. Check what the API expects vs what exists
    console.log('2️⃣ Data mismatch analysis:\n');

    console.log('   Frontend expects (from CompanyListItem type):');
    console.log('   - id, name, slug, is_active, created_at');
    console.log('   - admin_user: { id, full_name, email }');
    console.log('   - stats: { total_users, total_leads, landing_pages_count }');
    console.log('');

    console.log('   API returns (from route.ts):');
    console.log('   - id, name, is_active, created_at, updated_at');
    console.log('   - user_count, lead_count, subscription_status');
    console.log('   ❌ Missing: admin_user object');
    console.log('   ❌ Missing: stats object');
    console.log('   ❌ Missing: slug field');
    console.log('');

    // 3. Check if companies table has necessary relationships
    console.log('3️⃣ Checking company relationships:\n');

    for (const company of companies) {
      console.log(`   📋 ${company.name} (${company.id.substring(0, 8)}...):`);

      // Check for admin user
      const { data: adminUsers, error: adminError } = await supabase
        .from('users')
        .select('id, full_name, email, role')
        .eq('company_id', company.id)
        .eq('role', 'company_owner')
        .limit(1);

      if (adminUsers && adminUsers.length > 0) {
        console.log(`      ✅ Admin user: ${adminUsers[0].full_name} (${adminUsers[0].email})`);
      } else {
        // Check if there are any users for this company
        const { count: userCount } = await supabase
          .from('users')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', company.id);

        console.log(`      ⚠️  No admin user (company_owner) found`);
        console.log(`      📊 Total users: ${userCount || 0}`);
      }

      // Check stats
      const { count: totalUsers } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      const { count: totalLeads } = await supabase
        .from('leads')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      const { count: totalPages } = await supabase
        .from('landing_pages')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', company.id);

      console.log(`      📊 Stats: ${totalUsers || 0} users, ${totalLeads || 0} leads, ${totalPages || 0} pages`);
      console.log('');
    }

    // 4. Check if slug column exists
    console.log('4️⃣ Checking slug column:\n');
    const hasSlug = 'slug' in companies[0];
    if (hasSlug) {
      console.log('   ✅ slug column exists');
      companies.forEach(c => {
        console.log(`      - ${c.name}: slug = "${c.slug || 'NULL'}"`);
      });
    } else {
      console.log('   ❌ slug column does NOT exist in companies table');
      console.log('   💡 Need to add slug column or remove from type definition');
    }
    console.log('');

    // 5. Summary
    console.log('📝 ISSUES FOUND:\n');
    console.log('   ❌ API Response Structure Mismatch:');
    console.log('      - API returns: { user_count, lead_count, subscription_status }');
    console.log('      - Frontend expects: { admin_user: {...}, stats: {...} }');
    console.log('');
    console.log('   ❌ Missing Data Transformation:');
    console.log('      - API needs to query admin user (company_owner)');
    console.log('      - API needs to format stats object correctly');
    console.log('      - API needs to query landing_pages count');
    console.log('');
    console.log('   ❌ Field Name Mismatch:');
    console.log('      - API uses: user_count, lead_count');
    console.log('      - Type expects: stats.total_users, stats.total_leads');
    console.log('');

    console.log('💡 SOLUTIONS:\n');
    console.log('   1. Update API to match type definition:');
    console.log('      - Query admin user (role = company_owner)');
    console.log('      - Format response with admin_user and stats objects');
    console.log('      - Add landing_pages_count to stats');
    console.log('');
    console.log('   2. Or update type definition to match API:');
    console.log('      - Change CompanyListItem to use flat structure');
    console.log('      - Remove nested admin_user and stats objects');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkCompaniesAPI();
