const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBlacklist() {
  try {
    console.log('Checking phone_blacklist table...\n');

    // 블랙리스트 데이터 조회
    const { data: blacklist, error } = await supabase
      .from('phone_blacklist')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error) {
      console.error('Error fetching blacklist:', error);
      return;
    }

    if (!blacklist || blacklist.length === 0) {
      console.log('❌ No blacklisted phone numbers found.');
      console.log('\nTo test, add a phone number to blacklist:');
      console.log('INSERT INTO phone_blacklist (phone_number, reason) VALUES (\'01012345678\', \'Test\');');
      return;
    }

    console.log(`✅ Found ${blacklist.length} blacklisted phone numbers:\n`);
    blacklist.forEach((item, index) => {
      console.log(`${index + 1}. Phone: ${item.phone_number}`);
      console.log(`   Reason: ${item.reason || 'N/A'}`);
      console.log(`   Created: ${new Date(item.created_at).toLocaleString('ko-KR')}`);
      console.log('');
    });

    console.log('\n📝 Test Instructions:');
    console.log('1. Start dev server: npm run dev');
    console.log('2. Go to a landing page form');
    console.log(`3. Submit with one of the blacklisted numbers above`);
    console.log('4. Expected: Success message displayed (not error)');
    console.log('5. Verify: No record in leads table with that phone number\n');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkBlacklist();
