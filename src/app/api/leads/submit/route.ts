import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { encryptPhone, hashPhone } from '@/lib/encryption/phone'

// POST /api/leads/submit - Public endpoint for lead submission
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const body = await request.json()

    const {
      landing_page_id,
      form_data,
      utm_source,
      utm_medium,
      utm_campaign,
      utm_content,
      utm_term,
      referrer,
    } = body

    // Validate required fields
    if (!landing_page_id || !form_data) {
      return NextResponse.json(
        { error: { message: 'Missing required fields' } },
        { status: 400 }
      )
    }

    // Get landing page to verify it exists and get hospital_id
    const { data: landingPage, error: lpError } = await supabase
      .from('landing_pages')
      .select('id, hospital_id, status')
      .eq('id', landing_page_id)
      .single()

    if (lpError || !landingPage) {
      return NextResponse.json(
        { error: { message: 'Landing page not found' } },
        { status: 404 }
      )
    }

    if (landingPage.status !== 'published') {
      return NextResponse.json(
        { error: { message: 'Landing page is not published' } },
        { status: 400 }
      )
    }

    // Extract and validate required fields
    const { name, phone, email } = form_data

    if (!name || !phone) {
      return NextResponse.json(
        { error: { message: 'Name and phone are required' } },
        { status: 400 }
      )
    }

    // Validate phone format (basic Korean phone number validation)
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
    if (!phoneRegex.test(phone.replace(/[^0-9]/g, ''))) {
      return NextResponse.json(
        { error: { message: 'Invalid phone number format' } },
        { status: 400 }
      )
    }

    // Encrypt phone and create hash
    const encryptedPhone = encryptPhone(phone)
    const phoneHash = hashPhone(phone)

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent')

    // Check for duplicate lead (same phone number for this hospital)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('hospital_id', landingPage.hospital_id)
      .eq('phone_hash', phoneHash)
      .single()

    if (existingLead) {
      return NextResponse.json(
        { error: { message: 'This phone number has already submitted a request' } },
        { status: 409 }
      )
    }

    // Extract additional fields from form_data
    const { consultation_items, preferred_date, preferred_time, message, ...customFields } =
      form_data

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        hospital_id: landingPage.hospital_id,
        landing_page_id,
        name,
        phone: encryptedPhone,
        phone_hash: phoneHash,
        email: email || null,
        consultation_items,
        preferred_date,
        preferred_time,
        message,
        status: 'new',
        priority: 'medium',
        utm_source,
        utm_medium,
        utm_campaign,
        utm_content,
        utm_term,
        referrer,
        ip_address: ipAddress,
        user_agent: userAgent,
      })
      .select('id')
      .single()

    if (leadError) throw leadError

    // Increment landing page submissions count
    await supabase.rpc('increment_landing_page_submissions', {
      page_id: landing_page_id,
    })

    // Auto-assign lead to staff if enabled
    // This will be handled by a database trigger or separate function
    // For now, we'll just create the lead with status 'new'

    return NextResponse.json({
      success: true,
      data: {
        id: lead.id,
        message: '신청이 완료되었습니다. 곧 연락드리겠습니다.',
      },
    })
  } catch (error: any) {
    console.error('Lead submission error:', error)
    return NextResponse.json(
      { success: false, error: { message: 'Submission failed. Please try again.' } },
      { status: 500 }
    )
  }
}
