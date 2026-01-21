import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { encryptPhone, hashPhone } from '@/lib/encryption/phone'
import { sendLeadNotificationEmail } from '@/lib/email/send-lead-notification'

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

    // Get landing page to verify it exists and get company_id
    const { data: landingPage, error: lpError } = await supabase
      .from('landing_pages')
      .select('id, company_id, status')
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

    // Validate phone format (Korean mobile phone number only)
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
    if (!phoneRegex.test(phone.replace(/[^0-9]/g, ''))) {
      return NextResponse.json(
        { error: { message: '휴대폰 번호를 입력해 주세요 (예: 010-1234-5678)' } },
        { status: 400 }
      )
    }

    // Encrypt phone and create hash
    const encryptedPhone = encryptPhone(phone)
    const phoneHash = hashPhone(phone)

    // Get client IP and user agent
    const ipAddress = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip')
    const userAgent = request.headers.get('user-agent') || ''

    // Detect device type from user agent
    const detectDeviceType = (ua: string): string => {
      const lowerUA = ua.toLowerCase()
      if (/mobile|android|iphone|ipod|blackberry|windows phone/i.test(lowerUA)) {
        return 'mobile'
      }
      if (/ipad|tablet|playbook|silk/i.test(lowerUA)) {
        return 'tablet'
      }
      return 'pc'
    }
    const deviceType = detectDeviceType(userAgent)

    // Note: phone_hash is stored for analytics purposes (duplicate detection across campaigns)
    // but we allow the same phone number to submit multiple times across different landing pages

    // Extract additional fields from form_data
    const { consultation_items, preferred_date, preferred_time, message, ...customFields } =
      form_data

    // Get landing page collect_fields to map custom field values
    const { data: lpWithFields } = await supabase
      .from('landing_pages')
      .select('collect_fields')
      .eq('id', landing_page_id)
      .single()

    // Extract custom field values based on collect_fields configuration
    const customFieldValues: Record<string, string | null> = {
      custom_field_1: null,
      custom_field_2: null,
      custom_field_3: null,
      custom_field_4: null,
      custom_field_5: null,
    }

    if (lpWithFields?.collect_fields && Array.isArray(lpWithFields.collect_fields)) {
      let customFieldIndex = 0
      lpWithFields.collect_fields.forEach((field: { type: string; id?: string; question?: string }) => {
        if (field.type === 'short_answer' || field.type === 'multiple_choice') {
          if (customFieldIndex < 5) {
            // Try to get value from form_data using field id or question as key
            const fieldKey = field.id || field.question
            const value = fieldKey ? (customFields[fieldKey] || form_data[fieldKey]) : null
            customFieldValues[`custom_field_${customFieldIndex + 1}`] = value || null
            customFieldIndex++
          }
        }
      })
    }

    // Create lead
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .insert({
        company_id: landingPage.company_id,
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
        device_type: deviceType,
        ...customFieldValues,
      })
      .select('id')
      .single()

    if (leadError) throw leadError

    // Increment landing page submissions count
    await supabase.rpc('increment_landing_page_submissions', {
      page_id: landing_page_id,
    })

    // Send email notification to company notification emails
    try {
      const { data: company } = await supabase
        .from('companies')
        .select('notification_emails')
        .eq('id', landingPage.company_id)
        .single()

      if (company?.notification_emails && Array.isArray(company.notification_emails)) {
        for (const notificationEmail of company.notification_emails) {
          await sendLeadNotificationEmail({
            recipientEmail: notificationEmail,
            leadData: {
              name,
              phone,
              email: email || undefined,
              consultation_items,
              preferred_date,
              preferred_time,
              message,
            },
            companyId: landingPage.company_id,
            landingPageId: landing_page_id,
          })
        }
        console.log(`✅ Lead notification emails sent to ${company.notification_emails.length} recipients`)
      }
    } catch (emailError) {
      // Log email error but don't fail the lead submission
      console.error('❌ Failed to send lead notification email:', emailError)
    }

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
