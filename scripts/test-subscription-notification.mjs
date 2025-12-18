#!/usr/bin/env node

/**
 * Test subscription notification by creating a new trial subscription
 * This should trigger:
 * 1. Realtime event to admin subscriptions page
 * 2. Automatic notification creation
 * 3. Realtime notification to NotificationBell
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function testSubscriptionNotification() {
  console.log('🧪 Testing subscription notification...\n')

  // 1. Get first company
  const { data: companies } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1)

  if (!companies || companies.length === 0) {
    console.error('❌ No companies found')
    return
  }

  const company = companies[0]
  console.log(`✅ Using company: ${company.name}`)

  // 2. Get first active plan
  const { data: plans } = await supabase
    .from('subscription_plans')
    .select('id, name')
    .eq('is_active', true)
    .limit(1)

  if (!plans || plans.length === 0) {
    console.error('❌ No subscription plans found')
    return
  }

  const plan = plans[0]
  console.log(`✅ Using plan: ${plan.name}\n`)

  // 3. Create trial subscription
  const now = new Date()
  const trialEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days from now
  const periodEnd = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

  const newSubscription = {
    company_id: company.id,
    plan_id: plan.id,
    status: 'trial',
    billing_cycle: 'monthly',
    current_period_start: now.toISOString(),
    current_period_end: periodEnd.toISOString(),
    trial_end: trialEnd.toISOString(),
  }

  console.log('📤 Creating trial subscription:')
  console.log(`   Company: ${company.name}`)
  console.log(`   Plan: ${plan.name}`)
  console.log(`   Status: trial`)
  console.log(`   Trial End: ${trialEnd.toLocaleDateString('ko-KR')}`)
  console.log()

  const { data: subscription, error } = await supabase
    .from('company_subscriptions')
    .insert(newSubscription)
    .select()
    .single()

  if (error) {
    console.error('❌ Error creating subscription:', error)
    return
  }

  console.log('✅ Subscription created successfully!')
  console.log(`   ID: ${subscription.id}`)
  console.log()

  // Wait a bit for trigger to execute
  console.log('⏳ Waiting for notification trigger...')
  await new Promise(resolve => setTimeout(resolve, 1000))

  // 4. Check if notification was created
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .eq('company_id', company.id)
    .eq('type', 'subscription_started')
    .order('created_at', { ascending: false })
    .limit(1)

  if (notifError) {
    console.error('❌ Error checking notifications:', notifError)
    return
  }

  if (notifications && notifications.length > 0) {
    console.log('✅ Notification created automatically!')
    console.log(`   Title: ${notifications[0].title}`)
    console.log(`   Message: ${notifications[0].message}`)
    console.log()
  } else {
    console.log('⚠️  No notification found (trigger may not be active)')
    console.log()
  }

  console.log('🔍 Check your browser WITHOUT refreshing:')
  console.log('   1. Admin subscriptions page: 새 구독이 즉시 표시되어야 합니다')
  console.log('   2. NotificationBell: 알림 배지가 즉시 업데이트되어야 합니다')
  console.log('   3. Admin notifications page: 새 알림이 즉시 표시되어야 합니다')
  console.log()
  console.log('📋 Expected notification message:')
  console.log(`   "${company.name}에서 ${plan.name} 플랜 체험을 시작했습니다. (7일 무료 체험)"`)
  console.log()
  console.log('🎯 브라우저 콘솔에서 확인:')
  console.log('   - Admin subscriptions: "🔔 Realtime subscription change: INSERT"')
  console.log('   - NotificationBell: "🔔 Realtime notification change: INSERT"')
  console.log()
  console.log('💡 테스트 후 생성된 구독을 삭제하려면:')
  console.log(`   DELETE FROM company_subscriptions WHERE id = '${subscription.id}';`)
}

testSubscriptionNotification().catch(console.error)
