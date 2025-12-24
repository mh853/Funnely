/**
 * 전체 필터 테스트를 위한 다양한 월의 리드 데이터 생성 스크립트
 *
 * 실행 방법:
 * NEXT_PUBLIC_SUPABASE_URL=<your-url> \
 * SUPABASE_SERVICE_ROLE_KEY=<your-key> \
 * node scripts/create-test-leads.js
 */

const { createClient } = require('@supabase/supabase-js')
const crypto = require('crypto')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ 환경 변수가 설정되지 않았습니다.')
  console.error('NEXT_PUBLIC_SUPABASE_URL과 SUPABASE_SERVICE_ROLE_KEY를 설정해주세요.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// 리드 상태 옵션 (실제 DB enum 값과 일치)
const statuses = ['new', 'converted', 'rejected', 'contract_completed']
const deviceTypes = ['pc', 'mobile']

// 랜덤 선택 헬퍼
const randomChoice = (arr) => arr[Math.floor(Math.random() * arr.length)]

// 월별 테스트 데이터 생성 함수
async function createTestLeadsForMonth(companyId, userIds, year, month, count) {
  const leads = []

  // 해당 월의 날짜 범위
  const daysInMonth = new Date(year, month, 0).getDate()

  for (let i = 0; i < count; i++) {
    const day = Math.floor(Math.random() * daysInMonth) + 1
    const hour = Math.floor(Math.random() * 24)
    const minute = Math.floor(Math.random() * 60)

    const createdAt = new Date(year, month - 1, day, hour, minute)
    const phone = `010-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`
    const phoneHash = crypto
      .createHash('sha256')
      .update(phone.replace(/\D/g, ''))
      .digest('hex')

    leads.push({
      company_id: companyId,
      name: `테스트 리드 ${year}년 ${month}월 ${i + 1}`,
      phone: phone,
      phone_hash: phoneHash,
      email: `test${year}${month}_${i}@example.com`,
      status: randomChoice(statuses),
      device_type: randomChoice(deviceTypes),
      call_assigned_to: randomChoice(userIds),
      created_at: createdAt.toISOString(),
      updated_at: createdAt.toISOString(),
    })
  }

  return leads
}

async function main() {
  console.log('🚀 전체 필터 테스트용 리드 데이터 생성 시작...\n')

  // 1. 회사 정보 조회 (첫 번째 회사 사용)
  console.log('📋 회사 정보 조회 중...')
  const { data: companies, error: companyError } = await supabase
    .from('companies')
    .select('id, name')
    .limit(1)

  if (companyError || !companies || companies.length === 0) {
    console.error('❌ 회사 정보를 찾을 수 없습니다:', companyError)
    process.exit(1)
  }

  const companyId = companies[0].id
  console.log(`✅ 회사: ${companies[0].name} (ID: ${companyId})\n`)

  // 2. 해당 회사의 사용자 조회
  console.log('👥 사용자 정보 조회 중...')
  const { data: users, error: userError } = await supabase
    .from('users')
    .select('id, full_name, department')
    .eq('company_id', companyId)

  if (userError) {
    console.error('❌ 사용자 정보 조회 실패:', userError)
    process.exit(1)
  }

  let userIds = []
  if (users && users.length > 0) {
    userIds = users.map(u => u.id)
    console.log(`✅ 사용자: ${users.length}명`)
    users.forEach(u => console.log(`   - ${u.full_name} (${u.department || '부서 미지정'})`))
  } else {
    console.log('⚠️  사용자가 없으므로 call_assigned_to는 null로 설정됩니다.')
    userIds = [null] // null 값을 배열에 넣어서 randomChoice가 null을 반환하도록
  }
  console.log('')

  // 3. 테스트 데이터 생성 계획
  const testPlan = [
    { year: 2024, month: 10, count: 15, label: '2024년 10월' },
    { year: 2024, month: 11, count: 20, label: '2024년 11월' },
    { year: 2024, month: 12, count: 25, label: '2024년 12월' },
    { year: 2025, month: 1, count: 18, label: '2025년 1월' },
  ]

  console.log('📅 테스트 데이터 생성 계획:')
  testPlan.forEach(plan => {
    console.log(`   - ${plan.label}: ${plan.count}개 리드`)
  })
  console.log('')

  // 4. 각 월별로 리드 데이터 생성 및 삽입
  let totalCreated = 0

  for (const plan of testPlan) {
    console.log(`🔄 ${plan.label} 리드 생성 중...`)

    const leads = await createTestLeadsForMonth(
      companyId,
      userIds,
      plan.year,
      plan.month,
      plan.count
    )

    const { data, error } = await supabase
      .from('leads')
      .insert(leads)
      .select()

    if (error) {
      console.error(`❌ ${plan.label} 리드 생성 실패:`, error)
      continue
    }

    console.log(`✅ ${plan.label}: ${data.length}개 리드 생성 완료`)
    totalCreated += data.length
  }

  console.log('')
  console.log('=' .repeat(50))
  console.log(`✅ 전체 ${totalCreated}개 테스트 리드 생성 완료!`)
  console.log('=' .repeat(50))
  console.log('')
  console.log('📊 이제 다음 URL에서 "전체" 필터를 테스트할 수 있습니다:')
  console.log('   /dashboard/reports?year=all&month=all')
  console.log('')
  console.log('✅ 기대 결과:')
  console.log('   - 2024년 10월 데이터 (15개)')
  console.log('   - 2024년 11월 데이터 (20개)')
  console.log('   - 2024년 12월 데이터 (25개)')
  console.log('   - 2025년 1월 데이터 (18개)')
  console.log('   - 총 78개 리드가 날짜순으로 표시되어야 합니다.')
}

main()
  .then(() => {
    console.log('\n✅ 스크립트 실행 완료')
    process.exit(0)
  })
  .catch(err => {
    console.error('\n❌ 스크립트 실행 실패:', err)
    process.exit(1)
  })
