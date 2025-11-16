import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CampaignsList from '@/components/campaigns/CampaignsList'
import CreateCampaignButton from '@/components/campaigns/CreateCampaignButton'
import SyncCampaignButton from '@/components/campaigns/SyncCampaignButton'

export default async function CampaignsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile (cached)
  const userProfile = await getCachedUserProfile(user.id)

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Check if user can manage campaigns
  const canManage = ['hospital_owner', 'hospital_admin', 'marketing_manager', 'marketing_staff'].includes(
    userProfile.role
  )

  // Get campaigns and ad accounts in parallel
  const [
    { data: campaigns, error },
    { data: adAccounts }
  ] = await Promise.all([
    supabase
      .from('campaigns')
      .select(`
        *,
        ad_accounts (
          id,
          platform,
          account_name
        )
      `)
      .eq('hospital_id', userProfile.hospital_id)
      .order('created_at', { ascending: false }),
    supabase
      .from('ad_accounts')
      .select('id, platform, account_name, status')
      .eq('hospital_id', userProfile.hospital_id)
      .eq('status', 'active')
  ])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">캠페인 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            광고 캠페인을 생성하고 성과를 관리합니다.
          </p>
        </div>
        {canManage && adAccounts && adAccounts.length > 0 && (
          <div className="flex items-center gap-3">
            {adAccounts[0] && (
              <SyncCampaignButton adAccountId={adAccounts[0].id} />
            )}
            <CreateCampaignButton adAccounts={adAccounts} />
          </div>
        )}
      </div>

      {/* Permission Warning */}
      {!canManage && (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-yellow-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">
                캠페인을 생성하려면 마케팅 권한이 필요합니다.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* No Ad Accounts Warning */}
      {canManage && (!adAccounts || adAccounts.length === 0) && (
        <div className="rounded-md bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg
                className="h-5 w-5 text-blue-400"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                광고 계정을 먼저 연동하세요
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  캠페인을 생성하려면 먼저 광고 플랫폼 계정을 연동해야 합니다.
                </p>
              </div>
              <div className="mt-4">
                <a
                  href="/dashboard/ad-accounts"
                  className="text-sm font-medium text-blue-800 hover:text-blue-900 underline"
                >
                  광고 계정 연동하기 →
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {(!campaigns || campaigns.length === 0) && canManage && adAccounts && adAccounts.length > 0 && (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            생성된 캠페인이 없습니다
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            첫 번째 광고 캠페인을 만들어보세요.
          </p>
          <div className="mt-6">
            <CreateCampaignButton adAccounts={adAccounts} />
          </div>
        </div>
      )}

      {/* Campaigns List */}
      {campaigns && campaigns.length > 0 && (
        <CampaignsList
          campaigns={campaigns}
          canManage={canManage}
          adAccounts={adAccounts || []}
        />
      )}
    </div>
  )
}
