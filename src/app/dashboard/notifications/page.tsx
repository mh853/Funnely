import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BellIcon } from '@heroicons/react/24/outline'

export default async function NotificationsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Get user profile
  const { data: userProfile } = await supabase
    .from('users')
    .select('hospital_id, role')
    .eq('id', user.id)
    .single()

  if (!userProfile) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">사용자 정보를 불러올 수 없습니다.</p>
      </div>
    )
  }

  // Get all notifications
  const { data: notifications } = await supabase
    .from('notifications')
    .select(`
      *,
      campaigns (
        campaign_name
      )
    `)
    .eq('hospital_id', userProfile.hospital_id)
    .order('created_at', { ascending: false })

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      budget_warning: '예산 경고',
      budget_critical: '예산 긴급',
      performance_anomaly: '성과 이상',
      campaign_status: '캠페인 상태',
      sync_complete: '동기화 완료',
    }
    return labels[type] || type
  }

  const getTypeBadge = (type: string) => {
    const badges: Record<string, string> = {
      budget_warning: 'bg-yellow-100 text-yellow-800',
      budget_critical: 'bg-red-100 text-red-800',
      performance_anomaly: 'bg-orange-100 text-orange-800',
      campaign_status: 'bg-blue-100 text-blue-800',
      sync_complete: 'bg-green-100 text-green-800',
    }
    return badges[type] || 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">알림</h1>
        <p className="mt-1 text-sm text-gray-600">
          예산, 성과, 캠페인 상태에 대한 알림을 확인합니다.
        </p>
      </div>

      {/* Notifications List */}
      <div className="bg-white shadow rounded-lg">
        {!notifications || notifications.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <BellIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">알림이 없습니다</h3>
            <p className="mt-1 text-sm text-gray-500">
              예산 소진율이 높거나 성과에 이상이 발생하면 알림을 받게 됩니다.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notification: any) => (
              <div
                key={notification.id}
                className={`px-6 py-4 hover:bg-gray-50 ${
                  !notification.is_read ? 'bg-blue-50' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold ${getTypeBadge(
                          notification.type
                        )}`}
                      >
                        {getTypeLabel(notification.type)}
                      </span>
                      {!notification.is_read && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          새 알림
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">
                      {notification.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-600">{notification.message}</p>
                    {notification.campaigns && (
                      <p className="mt-1 text-xs text-gray-500">
                        캠페인: {notification.campaigns.campaign_name}
                      </p>
                    )}
                    <p className="mt-2 text-xs text-gray-400">
                      {new Date(notification.created_at).toLocaleDateString('ko-KR', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                  {notification.campaign_id && (
                    <a
                      href={`/dashboard/campaigns/${notification.campaign_id}`}
                      className="ml-4 flex-shrink-0 text-sm font-medium text-blue-600 hover:text-blue-700"
                    >
                      보기 →
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
