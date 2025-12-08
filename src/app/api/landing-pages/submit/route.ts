import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { FormSubmission } from '@/types/landing-page.types'
import crypto from 'crypto'

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

    // Get landing page to retrieve company_id
    const { data: landingPage, error: lpError } = await supabase
      .from('landing_pages')
      .select('company_id, status')
      .eq('id', landing_page_id)
      .single()

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

    // Extract contact information
    const name = form_data.name || form_data.이름 || ''
    const phone = form_data.phone || form_data.전화번호 || ''
    const email = form_data.email || form_data.이메일 || undefined

    if (!name || !phone) {
      return NextResponse.json(
        { error: { message: '이름과 전화번호는 필수입니다' } },
        { status: 400 }
      )
    }

    // Convert referrer short_id to actual user UUID
    let actualReferrerUserId: string | undefined = undefined
    if (referrer_user_id) {
      const { data: referrerUser } = await supabase
        .from('users')
        .select('id')
        .eq('short_id', referrer_user_id)
        .single()

      if (referrerUser) {
        actualReferrerUserId = referrerUser.id
      }
    }

    // Hash phone number for duplicate detection
    const phoneHash = crypto
      .createHash('sha256')
      .update(phone.replace(/\D/g, ''))
      .digest('hex')

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
        referrer_user_id: actualReferrerUserId, // ref 파라미터(short_id)로 조회한 실제 user UUID
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: metadata?.user_agent,
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
