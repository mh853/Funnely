import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon } from '@heroicons/react/24/outline'
import SheetSyncSettings from '@/components/sheets/SheetSyncSettings'
import SheetSyncGuide from '@/components/sheets/SheetSyncGuide'

export default async function SheetSyncPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    redirect('/auth/login')
  }

  // admin만 접근 가능
  const isAdmin = userProfile.simple_role === 'admin'
  if (!isAdmin) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-yellow-50 p-4 max-w-md mx-auto">
          <p className="text-sm text-yellow-700">
            시트 동기화 설정은 관리자만 접근할 수 있습니다.
          </p>
        </div>
      </div>
    )
  }

  // 랜딩페이지 목록 가져오기
  const { data: landingPages } = await supabase
    .from('landing_pages')
    .select('id, title')
    .eq('company_id', userProfile.company_id)
    .order('title')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Google Sheets 동기화</h1>
          <p className="mt-1 text-sm text-gray-600">
            Meta 광고 데이터를 Google Sheets에서 자동으로 가져옵니다
          </p>
        </div>
      </div>

      {/* 단계별 연동 가이드 */}
      <SheetSyncGuide />

      {/* 동기화 설정 컴포넌트 */}
      <div className="bg-white shadow rounded-xl p-6">
        <SheetSyncSettings
          companyId={userProfile.company_id}
          landingPages={landingPages || []}
        />
      </div>
    </div>
  )
}
