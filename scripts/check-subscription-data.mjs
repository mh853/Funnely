// Check subscription data for companies
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

async function checkSubscriptionData() {
  console.log('📊 Checking subscription data for companies...\n');

  try {
    // 1. Check subscription plans
    console.log('1️⃣ Subscription Plans Available:');
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('display_order');

    if (plansError) {
      console.error('   ❌ Error:', plansError);
      return;
    }

    if (!plans || plans.length === 0) {
      console.log('   ⚠️  No active plans found\n');
    } else {
      plans.forEach(plan => {
        console.log(`   📋 ${plan.display_name} (${plan.plan_name}):`);
        console.log(`      - Monthly: ${plan.monthly_price.toLocaleString()}원/월`);
        console.log(`      - Yearly: ${plan.yearly_price.toLocaleString()}원/년`);
        console.log(`      - Features: ${JSON.parse(plan.features).join(', ')}`);
        console.log('');
      });
    }

    // 2. Check companies
    console.log('2️⃣ Companies and Their Subscriptions:\n');
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');

    if (companiesError) {
      console.error('   ❌ Error:', companiesError);
      return;
    }

    for (const company of companies) {
      console.log(`   📋 ${company.name} (${company.id.substring(0, 8)}...):`);

      // Check subscription
      const { data: subscription, error: subError } = await supabase
        .from('company_subscriptions')
        .select(`
          id,
          status,
          billing_cycle,
          trial_start_date,
          trial_end_date,
          current_period_start,
          current_period_end,
          created_at,
          subscription_plans (
            plan_name,
            display_name,
            monthly_price,
            yearly_price
          )
        `)
        .eq('company_id', company.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError) {
        if (subError.code === 'PGRST116') {
          console.log('      ⚠️  No subscription');
        } else {
          console.error(`      ❌ Error: ${subError.message}`);
        }
      } else {
        console.log(`      ✅ Plan: ${subscription.subscription_plans.display_name}`);
        console.log(`      📊 Status: ${subscription.status}`);
        console.log(`      🔄 Billing: ${subscription.billing_cycle}`);

        const price = subscription.billing_cycle === 'monthly'
          ? subscription.subscription_plans.monthly_price
          : subscription.subscription_plans.yearly_price;

        console.log(`      💰 Price: ${price.toLocaleString()}원/${subscription.billing_cycle === 'monthly' ? '월' : '년'}`);

        if (subscription.status === 'trial' && subscription.trial_end_date) {
          const trialEnd = new Date(subscription.trial_end_date);
          const now = new Date();
          const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
          console.log(`      🎁 Trial ends: ${trialEnd.toLocaleDateString('ko-KR')} (${daysLeft}일 남음)`);
        }

        if (subscription.current_period_end) {
          const periodEnd = new Date(subscription.current_period_end);
          console.log(`      📅 Next payment: ${periodEnd.toLocaleDateString('ko-KR')}`);
        }

        console.log(`      📆 Subscribed since: ${new Date(subscription.created_at).toLocaleDateString('ko-KR')}`);
      }

      // Check payment transactions
      const { data: payments, error: paymentsError } = await supabase
        .from('payment_transactions')
        .select('*')
        .eq('company_id', company.id)
        .eq('status', 'success')
        .order('approved_at', { ascending: false });

      if (paymentsError) {
        console.error(`      ❌ Payment history error: ${paymentsError.message}`);
      } else if (payments && payments.length > 0) {
        const totalPaid = payments.reduce((sum, p) => sum + p.total_amount, 0);
        console.log(`      💳 Payment history: ${payments.length}회, Total: ${totalPaid.toLocaleString()}원`);
        console.log(`      📅 Recent payments:`);
        payments.slice(0, 3).forEach(p => {
          const date = new Date(p.approved_at).toLocaleDateString('ko-KR');
          console.log(`         - ${date}: ${p.total_amount.toLocaleString()}원 (${p.payment_method})`);
        });
      } else {
        console.log('      💳 No payment history');
      }

      console.log('');
    }

    // 3. Summary statistics
    console.log('3️⃣ Overall Statistics:\n');

    const { data: allSubs } = await supabase
      .from('company_subscriptions')
      .select('status, billing_cycle');

    if (allSubs && allSubs.length > 0) {
      const byStatus = allSubs.reduce((acc, sub) => {
        acc[sub.status] = (acc[sub.status] || 0) + 1;
        return acc;
      }, {});

      const byCycle = allSubs.reduce((acc, sub) => {
        acc[sub.billing_cycle] = (acc[sub.billing_cycle] || 0) + 1;
        return acc;
      }, {});

      console.log('   Status distribution:');
      Object.entries(byStatus).forEach(([status, count]) => {
        console.log(`      - ${status}: ${count}`);
      });

      console.log('\n   Billing cycle distribution:');
      Object.entries(byCycle).forEach(([cycle, count]) => {
        console.log(`      - ${cycle}: ${count}`);
      });
    } else {
      console.log('   ⚠️  No subscriptions in system');
    }

    const { data: allPayments } = await supabase
      .from('payment_transactions')
      .select('total_amount, status')
      .eq('status', 'success');

    if (allPayments && allPayments.length > 0) {
      const totalRevenue = allPayments.reduce((sum, p) => sum + p.total_amount, 0);
      console.log(`\n   💰 Total revenue: ${totalRevenue.toLocaleString()}원`);
      console.log(`   📊 Total successful payments: ${allPayments.length}회`);
    } else {
      console.log('\n   💰 No payment revenue yet');
    }

    console.log('\n\n💡 Recommendation for Admin Companies Page:');
    console.log('   Display columns:');
    console.log('   1. 구독 플랜 (Plan name: 베이직/프로/엔터프라이즈)');
    console.log('   2. 구독 상태 (Status: trial/active/past_due/canceled/expired)');
    console.log('   3. 결제 금액 (Monthly/Yearly price)');
    console.log('   4. 다음 결제일 (Next payment date: current_period_end)');
    console.log('   5. 총 결제금액 (Sum of successful payment_transactions)');
    console.log('   6. 결제 횟수 (Count of successful payment_transactions)');

  } catch (err) {
    console.error('❌ Error:', err);
  }
}

checkSubscriptionData();
