import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, email, phone, company, inquiry_type, subject, message } = body

    if (!name || !email || !subject || !message || !inquiry_type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    const { data, error } = await supabase
      .from('public_inquiries')
      .insert({
        inquiry_type,
        name,
        email,
        phone: phone || null,
        company: company || null,
        subject,
        message,
      })
      .select('id')
      .single()

    if (error) {
      console.error('Public inquiry insert error:', error)
      return NextResponse.json(
        { error: 'Failed to submit inquiry' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      inquiry_id: data.id,
    })
  } catch (error) {
    console.error('Public inquiry API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
