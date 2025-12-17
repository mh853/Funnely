// Check payment data for companies
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

async function checkPaymentData() {
  console.log('💳 Checking payment data for companies...\n');

  try {
    // 1. Check companies
    console.log('1️⃣ Companies:');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');

    if (companiesError) {
      console.error('   ❌ Error:', companiesError);
      return;
    }

    console.log(`   ✅ Found ${companies.length} companies\n`);

    // 2. Check lead_payments table
    console.log('2️⃣ Lead Payments (리드별 결제 내역):\n');

    for (const company of companies) {
      console.log(`   📋 ${company.name} (${company.id.substring(0, 8)}...):`);

      // Get all payments for this company
      const { data: payments, error: paymentsError } = await supabase
        .from('lead_payments')
        .select('*')
        .eq('company_id', company.id)
        .order('payment_date', { ascending: false });

      if (paymentsError) {
        console.error(`      ❌ Error: ${paymentsError.message}`);
        continue;
      }

      if (!payments || payments.length === 0) {
        console.log('      ⚠️  No payment records');
      } else {
        const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
        const paymentCount = payments.length;

        console.log(`      💰 Total amount: ${totalAmount.toLocaleString()}원`);
        console.log(`      📊 Payment count: ${paymentCount}회`);
        console.log(`      📅 Recent payments:`);

        payments.slice(0, 3).forEach(p => {
          const date = new Date(p.payment_date).toLocaleDateString('ko-KR');
          console.log(`         - ${date}: ${p.amount.toLocaleString()}원 ${p.notes ? `(${p.notes})` : ''}`);
        });
      }
      console.log('');
    }

    // 3. Check company_subscriptions table
    console.log('3️⃣ Company Subscriptions (구독 정보):\n');

    for (const company of companies) {
      console.log(`   📋 ${company.name} (${company.id.substring(0, 8)}...):`);

      const { data: subscription, error: subError } = await supabase
        .from('company_subscriptions')
        .select(`
          *,
          subscription_plans(plan_name, display_name, monthly_price, yearly_price)
        `)
        .eq('company_id', company.id)
        .single();

      if (subError) {
        if (subError.code === 'PGRST116') {
          console.log('      ⚠️  No subscription');
        } else {
          console.error(`      ❌ Error: ${subError.message}`);
        }
      } else {
        console.log(`      💳 Plan: ${subscription.subscription_plans?.display_name || 'Unknown'}`);
        console.log(`      📊 Status: ${subscription.status}`);
        console.log(`      🔄 Billing cycle: ${subscription.billing_cycle}`);

        const price = subscription.billing_cycle === 'monthly'
          ? subscription.subscription_plans?.monthly_price
          : subscription.subscription_plans?.yearly_price;

        if (price) {
          console.log(`      💰 Price: ${price.toLocaleString()}원/${subscription.billing_cycle === 'monthly' ? '월' : '년'}`);
        }

        if (subscription.current_period_start && subscription.current_period_end) {
          const start = new Date(subscription.current_period_start).toLocaleDateString('ko-KR');
          const end = new Date(subscription.current_period_end).toLocaleDateString('ko-KR');
          console.log(`      📅 Period: ${start} ~ ${end}`);
        }
      }
      console.log('');
    }

    // 4. Check subscription_payments table if exists
    console.log('4️⃣ Subscription Payment History:\n');

    const { data: subPayments, error: subPaymentsError } = await supabase
      .from('subscription_payments')
      .select('*')
      .order('payment_date', { ascending: false })
      .limit(10);

    if (subPaymentsError) {
      if (subPaymentsError.code === '42P01') {
        console.log('   ⚠️  subscription_payments table does not exist\n');
      } else {
        console.error(`   ❌ Error: ${subPaymentsError.message}\n`);
      }
    } else {
      if (!subPayments || subPayments.length === 0) {
        console.log('   ⚠️  No subscription payment records\n');
      } else {
        console.log(`   ✅ Found ${subPayments.length} subscription payments\n`);
        subPayments.forEach(p => {
          const date = new Date(p.payment_date).toLocaleDateString('ko-KR');
          console.log(`      - ${date}: ${p.amount.toLocaleString()}원 (${p.status})`);
        });
      }
    }

    // 5. Summary
    console.log('\n📊 SUMMARY:\n');
    console.log('   Available payment data sources:');
    console.log('   1. lead_payments - 리드별 결제 내역');
    console.log('      - Per-lead payment tracking');
    console.log('      - Fields: amount, payment_date, notes');
    console.log('');
    console.log('   2. company_subscriptions - 구독 정보');
    console.log('      - Subscription plan and status');
    console.log('      - Fields: plan, status, billing_cycle, period');
    console.log('');
    console.log('   3. subscription_payments - 구독 결제 내역 (if exists)');
    console.log('      - Subscription payment history');
    console.log('      - May not exist yet');
    console.log('');
    console.log('💡 Recommended display in Companies page:');
    console.log('   - Lead payments: Total amount + Count');
    console.log('   - Subscription: Current plan + Status + Next payment date');
    console.log('   - Optional: MRR (Monthly Recurring Revenue)');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkPaymentData();
