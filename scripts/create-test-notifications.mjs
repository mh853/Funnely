#!/usr/bin/env node

/**
 * Create test notifications for admin panel
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

async function createTestNotifications() {
  console.log('🔍 Creating test notifications...\n')

  // Get first company
  const { data: companies } = await supabase
    .from('companies')
    .select('id')
    .limit(1)

  if (!companies || companies.length === 0) {
    console.error('❌ No companies found. Please create a company first.')
    return
  }

  const companyId = companies[0].id
  console.log(`✅ Using company ID: ${companyId}\n`)

  // Create sample notifications
  const testNotifications = [
    {
      company_id: companyId,
      title: '신규 리드가 등록되었습니다',
      message: '김철수님이 "프리미엄 플랜" 랜딩페이지를 통해 등록하셨습니다.',
      type: 'new_lead',
      is_read: false,
    },
    {
      company_id: companyId,
      title: '캠페인 상태가 변경되었습니다',
      message: '"여름 프로모션" 캠페인이 활성화되었습니다.',
      type: 'status_change',
      is_read: false,
    },
    {
      company_id: companyId,
      title: '월간 목표를 달성했습니다',
      message: '이번 달 리드 목표 100건을 달성했습니다. 축하합니다!',
      type: 'goal_achieved',
      is_read: true,
    },
    {
      company_id: companyId,
      title: '월간 리포트가 준비되었습니다',
      message: '2025년 1월 월간 리포트를 확인하실 수 있습니다.',
      type: 'report_ready',
      is_read: false,
    },
    {
      company_id: companyId,
      title: '새로운 사용자가 추가되었습니다',
      message: '이영희님이 팀에 합류했습니다.',
      type: 'user_activity',
      is_read: true,
    },
  ]

  const { data, error } = await supabase
    .from('notifications')
    .insert(testNotifications)
    .select()

  if (error) {
    console.error('❌ Error creating notifications:', error)
    return
  }

  console.log(`✅ Created ${data.length} test notifications\n`)

  // Show summary
  const { count } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })

  const { count: unreadCount } = await supabase
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('is_read', false)

  console.log(`📊 Summary:`)
  console.log(`   Total notifications: ${count}`)
  console.log(`   Unread notifications: ${unreadCount}`)
  console.log(`   Read notifications: ${count - unreadCount}`)
}

createTestNotifications().catch(console.error)
