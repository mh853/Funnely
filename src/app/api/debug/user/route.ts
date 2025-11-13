import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get hospital info if user profile exists
    let hospital = null
    let hospitalError = null
    if (userProfile && userProfile.hospital_id) {
      const result = await supabase
        .from('hospitals')
        .select('*')
        .eq('id', userProfile.hospital_id)
        .single()
      hospital = result.data
      hospitalError = result.error
    }

    return NextResponse.json({
      auth_user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
      },
      user_profile: userProfile,
      profile_error: profileError,
      hospital: hospital,
      hospital_error: hospitalError,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
