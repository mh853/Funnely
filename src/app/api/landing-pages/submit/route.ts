import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { FormSubmission } from '@/types/landing-page.types'
import crypto from 'crypto'

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

export async function POST(request: NextRequest) {
  try {
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

    // Hash phone number for duplicate detection
    const phoneHash = crypto
      .createHash('sha256')
      .update(phone.replace(/\D/g, ''))
      .digest('hex')

    // Parallel query execution - 모든 독립적인 쿼리를 동시에 실행
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()

    const [
      { data: landingPage, error: lpError },
      { data: referrerCompany },
      { data: existingLead }
    ] = await Promise.all([
      // 1. Landing page 조회
      supabase
        .from('landing_pages')
        .select('company_id, status, collect_fields')
        .eq('id', landing_page_id)
        .single(),

      // 2. Referrer company 조회 (referrer_user_id가 있을 때만)
      referrer_user_id
        ? supabase
            .from('companies')
            .select('id')
            .eq('short_id', referrer_user_id)
            .single()
        : Promise.resolve({ data: null, error: null }),

      // 3. 중복 체크 (landing_page_id로 임시 조회, 이후 company_id로 재검증)
      supabase
        .from('leads')
        .select('id, company_id')
        .eq('phone_hash', phoneHash)
        .gte('created_at', threeHoursAgo)
        .limit(1)
        .maybeSingle()
    ])

    // Landing page 검증
    if (lpError || !landingPage) {
      return NextResponse.json(
        { error: { message: '랜딩 페이지를 찾을 수 없습니다' } },
        { status: 404 }
      )
    }

    if (landingPage.status !== 'published') {
      return NextResponse.json(
        { error: { message: '게시되지 않은 페이지입니다' } },
        { status: 403 }
      )
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
    Object.entries(form_data).forEach(([key, value]) => {
      if (!reservedKeys.includes(key) &&
          typeof value === 'string' &&
          value.trim() !== '' &&
          !customFields.some(cf => cf.label === key)) {
        customFields.push({
          label: key,
          value: value
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
        phone, // Note: In production, this should be encrypted
        phone_hash: phoneHash,
        email,
        message: form_data.message || form_data.메시지 || undefined,
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

    // Increment submissions count (fire and forget - non-blocking)
    // Using .then() to convert to Promise before .catch()
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
      })

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
