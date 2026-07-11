import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { FormSubmission } from '@/types/landing-page.types'
import { hashPhone, encryptPhone } from '@/lib/encryption/phone'

// User-Agent를 분석하여 기기 타입 감지
function detectDeviceType(userAgent: string | undefined): 'pc' | 'mobile' | 'tablet' | 'unknown' {
  if (!userAgent) return 'unknown'

  const ua = userAgent.toLowerCase()

  // 태블릿 감지 (모바일보다 먼저 체크해야 함)
  if (/ipad|android(?!.*mobile)|tablet|playbook|silk/i.test(ua)) {
    return 'tablet'
  }

  // 모바일 감지
  if (/mobile|iphone|ipod|android.*mobile|webos|blackberry|opera mini|opera mobi|iemobile|windows phone/i.test(ua)) {
    return 'mobile'
  }

  // 봇/크롤러 감지 (unknown 처리)
  if (/bot|crawler|spider|scraper|headless/i.test(ua)) {
    return 'unknown'
  }

  // 나머지는 PC로 간주
  return 'pc'
}

// Service Role client for public form submissions (bypasses RLS)
function getServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

// 이 엔드포인트는 인증 없이 완전히 공개되어 있고 요청 제한이 전혀 없어,
// 스크립트로 특정 회사의 leads 테이블을 무한정 채워 넣을 수 있었다
// (/api/contact와 동일한 방식의 인메모리 IP 제한 — 여러 사무실이 같은 공인
// IP를 공유할 수 있어 contact보다 넉넉하게 잡는다).
const requestCounts = new Map<string, { count: number; resetTime: number }>()
const RATE_LIMIT = 10
const RATE_WINDOW = 60 * 60 * 1000 // 1시간

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const record = requestCounts.get(ip)

  if (!record || now > record.resetTime) {
    requestCounts.set(ip, { count: 1, resetTime: now + RATE_WINDOW })
    return true
  }

  if (record.count >= RATE_LIMIT) {
    return false
  }

  record.count++
  return true
}

export async function POST(request: NextRequest) {
  try {
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown'
    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        { error: { message: '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.' } },
        { status: 429 }
      )
    }

    const supabase = getServiceRoleClient()
    const body: FormSubmission = await request.json()

    const { landing_page_id, form_data, utm_params, referrer_user_id, metadata } = body

    // Validate required fields
    if (!landing_page_id || !form_data) {
      return NextResponse.json(
        { error: { message: '필수 정보가 누락되었습니다' } },
        { status: 400 }
      )
    }

    // Extract contact information first (needed for validation)
    const name = form_data.name || form_data.이름 || ''
    const phone = form_data.phone || form_data.전화번호 || ''
    const email = form_data.email || form_data.이메일 || undefined

    if (!name || !phone) {
      return NextResponse.json(
        { error: { message: '이름과 전화번호는 필수입니다' } },
        { status: 400 }
      )
    }

    // 클라이언트 검증은 프론트에만 있고 이 API는 직접 호출도 가능해, 값이
    // 비어있지 않기만 하면 전부 통과시키고 있었다("123" 같은 값도 그대로
    // 리드로 저장됨). 자릿수와 길이를 서버에서도 검증한다.
    const phoneDigitsOnly = phone.replace(/\D/g, '')
    if (phoneDigitsOnly.length < 9 || phoneDigitsOnly.length > 11) {
      return NextResponse.json(
        { error: { message: '올바른 전화번호를 입력해주세요' } },
        { status: 400 }
      )
    }
    if (name.length > 100) {
      return NextResponse.json(
        { error: { message: '이름이 너무 깁니다' } },
        { status: 400 }
      )
    }
    if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
      return NextResponse.json(
        { error: { message: '올바른 이메일 주소를 입력해주세요' } },
        { status: 400 }
      )
    }

    // 전화번호 해시 (중복 체크용 — 라이브러리 공통 구현 사용)
    const phoneHash = hashPhone(phoneDigitsOnly)

    // Phase 1: 랜딩페이지 조회 (company_id가 필요한 후속 쿼리를 위해 먼저 실행)
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

    const { data: landingPage, error: lpError } = await supabase
      .from('landing_pages')
      .select('company_id, title, status, is_active, collect_fields, timer_enabled, timer_deadline, timer_auto_update, require_privacy_consent')
      .eq('id', landing_page_id)
      .single()

    // Landing page 검증
    if (lpError || !landingPage) {
      return NextResponse.json(
        { error: { message: '랜딩 페이지를 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    if (landingPage.status !== 'published' || !landingPage.is_active) {
      return NextResponse.json(
        { error: { message: '게시되지 않은 페이지입니다' } },
        { status: 403 }
      )
    }

    // 개인정보 동의 서버 검증
    if (landingPage.require_privacy_consent && !form_data.privacy_consent) {
      return NextResponse.json(
        { error: { message: '개인정보 수집 및 이용에 동의해주세요' } },
        { status: 400 }
      )
    }

    // Timer 만료 체크
    if (landingPage.timer_enabled &&
        landingPage.timer_deadline &&
        !landingPage.timer_auto_update) {
      const deadline = new Date(landingPage.timer_deadline)
      if (new Date() > deadline) {
        return NextResponse.json(
          { error: { message: '신청 기간이 종료되었습니다.' } },
          { status: 403 }
        )
      }
    }

    // Phase 2: 나머지 쿼리를 병렬로 실행 (company_id 확보 후)
    const [
      { data: referrerCompany },
      { data: existingLead },
      { data: blacklistedPhone }
    ] = await Promise.all([
      // 1. Referrer company 조회
      referrer_user_id
        ? supabase
            .from('companies')
            .select('id')
            .eq('short_id', referrer_user_id)
            .single()
        : Promise.resolve({ data: null, error: null }),

      // 2. 중복 체크 (같은 회사 내에서만)
      supabase
        .from('leads')
        .select('id, company_id')
        .eq('phone_hash', phoneHash)
        .gte('created_at', threeHoursAgo)
        .limit(1)
        .maybeSingle(),

      // 3. 블랙리스트 체크 (회사별 필터링 — company_id는 Phase 1에서 확보)
      supabase
        .from('phone_blacklist')
        .select('id')
        .eq('phone_number', phone.replace(/\D/g, ''))
        .eq('company_id', landingPage.company_id)
        .maybeSingle()
    ])

    // 블랙리스트 체크 - Silent handling (사용자에게 에러 표시 안 함)
    if (blacklistedPhone) {
      // 서버 로그에 차단 기록 (전화번호 마스킹으로 개인정보 보호)
      console.log('[Landing Page Submit] Blocked blacklisted phone (silent):', {
        phone: phone.replace(/\d{4}$/, '****'), // 뒷자리 마스킹
        landing_page_id,
        company_id: landingPage.company_id,
        timestamp: new Date().toISOString(),
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: metadata?.user_agent
      })

      // ✅ 정상 성공 응답 반환 (실제로는 DB 저장 안 함)
      // 사용자는 블랙리스트 여부를 알 수 없음 → 우회 시도 방지
      return NextResponse.json({
        success: true,
        data: {
          lead_id: null, // 실제 lead_id 없음 (DB 저장 안 했으므로)
          message: '신청이 완료되었습니다',
        },
      })
    }

    // Referrer company ID 설정
    const actualReferrerCompanyId = referrerCompany?.id

    // 중복 체크 (같은 회사 내에서만)
    if (existingLead && existingLead.company_id === landingPage.company_id) {
      return NextResponse.json(
        { error: { message: '이미 신청완료 되었습니다.' } },
        { status: 409 }
      )
    }

    // Extract custom fields from form_data based on collect_fields configuration
    // form_data contains keys like "질문명": "답변값" for custom fields
    const customFields: Array<{ label: string; value: string }> = []
    const reservedKeys = ['name', '이름', 'phone', '전화번호', 'email', '이메일', 'message', '메시지',
                          'privacy_consent', 'marketing_consent', 'consultation_items',
                          'preferred_date', 'preferred_time']

    // Get custom field questions from landing page's collect_fields
    const collectFields = landingPage.collect_fields as Array<{
      type: string
      question?: string
      options?: string[]
    }> | null

    if (collectFields && Array.isArray(collectFields)) {
      // Extract questions for short_answer and multiple_choice types
      const customFieldQuestions = collectFields
        .filter(field => field.type === 'short_answer' || field.type === 'multiple_choice')
        .map(field => field.question)
        .filter((q): q is string => !!q)

      // Match form_data keys with custom field questions
      customFieldQuestions.forEach(question => {
        if (form_data[question]) {
          customFields.push({
            label: question,
            value: String(form_data[question])
          })
        }
      })
    }

    // Also capture any non-reserved fields that might be custom
    // (개수·길이 제한이 없어 form_data에 임의의 키를 수백 개, 각각 수백KB 문자열로
    // 채워 보내면 그대로 저장되고 있었다 — 리드 목록/내보내기 성능 저하 위험)
    const MAX_CUSTOM_FIELDS = 50
    const MAX_FIELD_VALUE_LENGTH = 2000
    Object.entries(form_data).forEach(([key, value]) => {
      if (customFields.length >= MAX_CUSTOM_FIELDS) return
      if (!reservedKeys.includes(key) &&
          typeof value === 'string' &&
          value.trim() !== '' &&
          !customFields.some(cf => cf.label === key)) {
        customFields.push({
          label: key.slice(0, 200),
          value: value.slice(0, MAX_FIELD_VALUE_LENGTH)
        })
      }
    })

    // Create lead record
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        company_id: landingPage.company_id,
        landing_page_id,
        name,
        phone: encryptPhone(phone),
        phone_hash: phoneHash,
        email,
        message: (form_data.message || form_data.메시지 || undefined)?.toString().slice(0, 5000),
        consultation_items: form_data.consultation_items || undefined,
        preferred_date: form_data.preferred_date || undefined,
        preferred_time: form_data.preferred_time || undefined,
        status: 'new',
        priority: 'medium',
        tags: [],
        utm_source: utm_params?.utm_source,
        utm_medium: utm_params?.utm_medium,
        utm_campaign: utm_params?.utm_campaign,
        utm_content: utm_params?.utm_content,
        utm_term: utm_params?.utm_term,
        referrer: metadata?.referrer,
        referrer_company_id: actualReferrerCompanyId, // ref 파라미터(short_id)로 조회한 실제 company UUID
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: metadata?.user_agent,
        device_type: detectDeviceType(metadata?.user_agent),
        custom_fields: customFields.length > 0 ? customFields : [],
      })
      .select()
      .single()

    if (leadError) {
      console.error('Lead creation error:', leadError)
      return NextResponse.json(
        { error: { message: '신청 처리 중 오류가 발생했습니다' } },
        { status: 500 }
      )
    }

    // 상담신청 알림 생성 (fire and forget - non-blocking)
    supabase.from('notifications').insert({
      company_id: landingPage.company_id,
      title: '새 상담 신청',
      message: `"${landingPage.title}" 랜딩페이지에 ${name}님(${phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3')})이 상담을 신청했습니다.`,
      type: 'new_lead',
      metadata: {
        lead_id: lead.id,
        landing_page_id,
        name,
        phone: phone.replace(/(\d{3})(\d{3,4})(\d{4})/, '$1-$2-$3'),
        email: email || null,
        device_type: detectDeviceType(metadata?.user_agent),
      },
    }).then(({ error }) => {
      if (error) console.error('[Submit] Failed to create lead notification:', error)
    })

    // Increment submissions count (fire and forget - non-blocking)
    supabase
      .from('landing_pages')
      .select('submissions_count')
      .eq('id', landing_page_id)
      .single()
      .then(({ data: currentPage }) => {
        supabase
          .from('landing_pages')
          .update({ submissions_count: (currentPage?.submissions_count || 0) + 1 })
          .eq('id', landing_page_id)
          .then(({ error }) => {
            if (error) console.error('[Submit] Failed to increment submissions_count:', error)
          })
      })
      .catch((err) => console.error('[Submit] Failed to fetch submissions_count:', err))

    // Return immediately without waiting for count update
    return NextResponse.json({
      success: true,
      data: {
        lead_id: lead.id,
        message: '신청이 완료되었습니다',
      },
    })
  } catch (error: any) {
    console.error('Form submission error:', error)
    return NextResponse.json(
      { error: { message: '서버 오류가 발생했습니다' } },
      { status: 500 }
    )
  }
}
