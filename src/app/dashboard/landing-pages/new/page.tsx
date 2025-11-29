import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import LandingPageForm from '@/components/landing-pages/LandingPageForm'

export default async function NewLandingPagePage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">새 랜딩 페이지 만들기</h1>
        <p className="mt-1 text-sm text-gray-600">
          DB 수집을 위한 랜딩 페이지를 만들어보세요.
        </p>
      </div>

      <LandingPageForm companyId={userProfile.company_id} userId={user.id} />
    </div>
  )
}
