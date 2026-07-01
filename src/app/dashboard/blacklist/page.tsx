import { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BlacklistClient from './BlacklistClient'

export const metadata: Metadata = {
  title: 'DB 블랙리스트 | Funnely',
  description: '랜딩페이지 스팸 방지를 위한 전화번호 블랙리스트 관리',
}

export default async function BlacklistPage() {
  const supabase = await createClient()

  // 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // 사용자 프로필 확인
  const { data: userProfile } = await supabase
    .from('users')
    .select('id, full_name, company_id, is_super_admin')
    .eq('id', user.id)
    .single()

  if (!userProfile?.company_id) {
    redirect('/dashboard')
  }

  // 블랙리스트 데이터 가져오기 (자사 데이터만, RLS가 추가 보호)
  const { data: blacklist, error } = await supabase
    .from('phone_blacklist')
    .select(
      `
      *,
      blocked_by:users!phone_blacklist_blocked_by_user_id_fkey(full_name)
    `
    )
    .order('blocked_at', { ascending: false })

  if (error) {
    console.error('Error fetching blacklist:', error)
  }

  return <BlacklistClient blacklist={blacklist || []} userProfile={userProfile} />
}
