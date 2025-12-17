// Simple subscription data check
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

async function checkSubscription() {
  console.log('📊 Checking subscription system...\n');

  // 1. Check if tables exist
  console.log('1️⃣ Checking tables:\n');

  const tables = [
    'subscription_plans',
    'company_subscriptions',
    'payment_transactions'
  ];

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1);

    if (error) {
      if (error.code === '42P01') {
        console.log(`   ❌ ${table}: Table does NOT exist`);
      } else {
        console.log(`   ❓ ${table}: ${error.message}`);
      }
    } else {
      console.log(`   ✅ ${table}: Table exists`);
      if (data && data[0]) {
        console.log(`      Columns: ${Object.keys(data[0]).join(', ')}`);
      }
    }
  }

  // 2. Check plans
  console.log('\n2️⃣ Subscription Plans:\n');
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('*');

  if (plans && plans.length > 0) {
    console.log(`   Found ${plans.length} plans:`);
    plans.forEach(p => {
      console.log(`   - ${p.name}: ${p.price_monthly?.toLocaleString() || '?'}원/월`);
    });
  } else {
    console.log('   ⚠️  No plans found');
  }

  // 3. Check company subscriptions
  console.log('\n3️⃣ Company Subscriptions:\n');
  const { data: subs } = await supabase
    .from('company_subscriptions')
    .select('*');

  if (subs && subs.length > 0) {
    console.log(`   Found ${subs.length} subscriptions`);
  } else {
    console.log('   ⚠️  No company subscriptions exist');
  }

  // 4. Check payment transactions
  console.log('\n4️⃣ Payment Transactions:\n');
  const { data: payments } = await supabase
    .from('payment_transactions')
    .select('*');

  if (payments && payments.length > 0) {
    console.log(`   Found ${payments.length} payment transactions`);
    const successful = payments.filter(p => p.status === 'success');
    if (successful.length > 0) {
      const total = successful.reduce((sum, p) => sum + (p.total_amount || 0), 0);
      console.log(`   - Successful: ${successful.length}회`);
      console.log(`   - Total revenue: ${total.toLocaleString()}원`);
    }
  } else {
    console.log('   ⚠️  No payment transactions');
  }

  console.log('\n\n📝 SUMMARY:\n');
  console.log('   Subscription system status:');
  console.log(`   - Plans available: ${plans?.length || 0}`);
  console.log(`   - Active subscriptions: ${subs?.length || 0}`);
  console.log(`   - Payment records: ${payments?.length || 0}`);

  if (subs && subs.length === 0) {
    console.log('\n   ⚠️  WARNING: No subscriptions exist!');
    console.log('   💡 You need to create test subscription data to see it in Admin page');
  }
}

checkSubscription();
