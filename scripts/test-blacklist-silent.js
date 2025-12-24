const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function testBlacklistSilentHandling() {
  try {
    console.log('🧪 Testing Blacklist Silent Handling...\n');

    // 1. 테스트용 랜딩페이지 조회
    const { data: landingPages } = await supabase
      .from('landing_pages')
      .select('id, title, slug')
      .eq('status', 'published')
      .eq('is_active', true)
      .limit(1)
      .single();

    if (!landingPages) {
      console.error('❌ No active landing page found for testing');
      return;
    }

    console.log(`✅ Using landing page: ${landingPages.title} (${landingPages.slug})\n`);

    // 2. 블랙리스트 번호로 테스트
    const blacklistedPhone = '01011112222'; // 블랙리스트에 있는 번호
    console.log(`📞 Test 1: Submitting blacklisted phone (${blacklistedPhone})...`);

    const response1 = await fetch('http://localhost:3000/api/landing-pages/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        landing_page_id: landingPages.id,
        form_data: {
          name: '테스트사용자',
          phone: blacklistedPhone,
          email: 'test@example.com'
        },
        utm_params: {},
        metadata: {
          referrer: 'http://localhost:3000',
          user_agent: 'test-script'
        }
      })
    });

    const result1 = await response1.json();
    console.log(`Status: ${response1.status}`);
    console.log('Response:', JSON.stringify(result1, null, 2));

    if (response1.status === 200 && result1.success === true) {
      console.log('✅ Test 1 PASSED: Returned 200 success (silent handling)\n');

      // DB에 저장되지 않았는지 확인
      const { data: lead1 } = await supabase
        .from('leads')
        .select('id')
        .eq('phone', blacklistedPhone)
        .eq('landing_page_id', landingPages.id)
        .maybeSingle();

      if (lead1) {
        console.log('❌ Test 1 FAILED: Blacklisted phone was saved to DB\n');
      } else {
        console.log('✅ DB Verification PASSED: Blacklisted phone not saved to DB\n');
      }
    } else {
      console.log('❌ Test 1 FAILED: Expected 200 success, got error\n');
    }

    // 3. 정상 번호로 테스트
    const normalPhone = '01012345678'; // 정상 번호 (블랙리스트 아님)
    console.log(`📞 Test 2: Submitting normal phone (${normalPhone})...`);

    // 먼저 기존 데이터 삭제 (중복 방지)
    await supabase
      .from('leads')
      .delete()
      .eq('phone', normalPhone)
      .eq('landing_page_id', landingPages.id);

    const response2 = await fetch('http://localhost:3000/api/landing-pages/submit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        landing_page_id: landingPages.id,
        form_data: {
          name: '정상사용자',
          phone: normalPhone,
          email: 'normal@example.com'
        },
        utm_params: {},
        metadata: {
          referrer: 'http://localhost:3000',
          user_agent: 'test-script'
        }
      })
    });

    const result2 = await response2.json();
    console.log(`Status: ${response2.status}`);
    console.log('Response:', JSON.stringify(result2, null, 2));

    if (response2.status === 200 && result2.success === true && result2.data.lead_id) {
      console.log('✅ Test 2 PASSED: Returned 200 success with lead_id\n');

      // DB에 저장되었는지 확인
      const { data: lead2 } = await supabase
        .from('leads')
        .select('id, name, phone')
        .eq('id', result2.data.lead_id)
        .single();

      if (lead2) {
        console.log('✅ DB Verification PASSED: Normal phone saved to DB');
        console.log(`   Lead: ${lead2.name} (${lead2.phone})\n`);

        // 테스트 데이터 정리
        await supabase
          .from('leads')
          .delete()
          .eq('id', lead2.id);
        console.log('🧹 Cleaned up test data\n');
      } else {
        console.log('❌ Test 2 FAILED: Normal phone not found in DB\n');
      }
    } else {
      console.log('❌ Test 2 FAILED: Expected 200 success with lead_id\n');
    }

    console.log('✅ All tests completed!\n');

  } catch (error) {
    console.error('❌ Test error:', error);
  }
}

testBlacklistSilentHandling();
