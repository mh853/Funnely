import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { encryptPhone, hashPhone } from '@/lib/encryption/phone'

// POST /api/leads/create - Create lead manually from dashboard
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // 사용자 인증 확인
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: { message: 'Unauthorized' } }, { status: 401 })
    }

    // 사용자 프로필 및 회사 정보 가져오기
    const { data: userProfile } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userProfile) {
      return NextResponse.json({ error: { message: 'User profile not found' } }, { status: 404 })
    }

    const body = await request.json()
    const { name, phone } = body

    // 필수 필드 검증
    if (!name || !phone) {
      return NextResponse.json(
        { error: { message: 'Name and phone are required' } },
        { status: 400 }
      )
    }

    // 전화번호 형식 검증
    const phoneRegex = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/
    const cleanPhone = phone.replace(/[^0-9]/g, '')
    if (!phoneRegex.test(cleanPhone)) {
      return NextResponse.json(
        { error: { message: '올바른 휴대폰 번호를 입력해주세요.' } },
        { status: 400 }
      )
    }

    // 전화번호 암호화
    const encryptedPhone = encryptPhone(phone)
    const phoneHash = hashPhone(phone)

    // 중복 확인 (같은 회사 내에서 같은 전화번호)
    const { data: existingLead } = await supabase
      .from('leads')
      .select('id')
      .eq('company_id', userProfile.company_id)
      .eq('phone_hash', phoneHash)
      .single()

    if (existingLead) {
      return NextResponse.json(
        { error: { message: '이미 등록된 전화번호입니다.' } },
        { status: 409 }
      )
    }

    // 리드 생성
    const { data: newLead, error: createError } = await supabase
      .from('leads')
      .insert({
        company_id: userProfile.company_id,
        name: name.trim(),
        phone: encryptedPhone,
        phone_hash: phoneHash,
        status: 'new',
        source: 'manual',
        device_type: 'manual',
      })
      .select()
      .single()

    if (createError) {
      console.error('Lead creation error:', createError)
      throw new Error('리드 생성에 실패했습니다.')
    }

    return NextResponse.json({
      success: true,
      data: { lead: newLead },
    })
  } catch (error: any) {
    console.error('Create lead error:', error)
    return NextResponse.json(
      { success: false, error: { message: error.message || 'Failed to create lead' } },
      { status: 500 }
    )
  }
}
