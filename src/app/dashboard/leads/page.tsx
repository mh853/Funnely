import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { decryptPhone } from '@/lib/encryption/phone'
import { PhoneIcon, EnvelopeIcon, CalendarIcon } from '@heroicons/react/24/outline'

export default async function LeadsPage() {
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

  // Get leads with landing page info
  const { data: leads } = await supabase
    .from('leads')
    .select(
      `
      *,
      landing_pages (
        id,
        title,
        slug
      ),
      users!leads_assigned_to_fkey (
        id,
        name
      )
    `
    )
    .eq('company_id', userProfile.company_id)
    .order('created_at', { ascending: false })
    .limit(50)

  const getStatusBadge = (status: string) => {
    const badges = {
      new: 'bg-blue-100 text-blue-800',
      assigned: 'bg-purple-100 text-purple-800',
      contacting: 'bg-yellow-100 text-yellow-800',
      consulting: 'bg-orange-100 text-orange-800',
      completed: 'bg-green-100 text-green-800',
      on_hold: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800',
    }
    const labels = {
      new: '신규',
      assigned: '배정됨',
      contacting: '연락중',
      consulting: '상담중',
      completed: '완료',
      on_hold: '보류',
      cancelled: '취소',
    }
    return { class: badges[status as keyof typeof badges], label: labels[status as keyof typeof labels] }
  }

  const getPriorityBadge = (priority: string) => {
    const badges = {
      low: 'bg-gray-100 text-gray-600',
      medium: 'bg-blue-100 text-blue-600',
      high: 'bg-orange-100 text-orange-600',
      urgent: 'bg-red-100 text-red-600',
    }
    const labels = {
      low: '낮음',
      medium: '보통',
      high: '높음',
      urgent: '긴급',
    }
    return { class: badges[priority as keyof typeof badges], label: labels[priority as keyof typeof labels] }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">리드 관리</h1>
          <p className="mt-1 text-sm text-gray-600">
            랜딩 페이지에서 수집된 고객 정보를 관리합니다.
          </p>
        </div>

        {/* Stats */}
        <div className="flex items-center space-x-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-gray-900">
              {leads?.filter((l) => l.status === 'new').length || 0}
            </p>
            <p className="text-xs text-gray-500">신규</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-blue-600">
              {leads?.filter((l) => ['assigned', 'contacting', 'consulting'].includes(l.status)).length || 0}
            </p>
            <p className="text-xs text-gray-500">진행중</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600">
              {leads?.filter((l) => l.status === 'completed').length || 0}
            </p>
            <p className="text-xs text-gray-500">완료</p>
          </div>
        </div>
      </div>

      {/* Leads List */}
      {!leads || leads.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg shadow">
          <PhoneIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">리드 없음</h3>
          <p className="mt-1 text-sm text-gray-500">
            랜딩 페이지를 통해 수집된 리드가 여기에 표시됩니다.
          </p>
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {leads.map((lead: any) => {
              const statusBadge = getStatusBadge(lead.status)
              const priorityBadge = getPriorityBadge(lead.priority)

              return (
                <li key={lead.id}>
                  <Link
                    href={`/dashboard/leads/${lead.id}`}
                    className="block hover:bg-gray-50 transition"
                  >
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <p className="text-sm font-medium text-gray-900">{lead.name}</p>
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusBadge.class}`}
                              >
                                {statusBadge.label}
                              </span>
                              <span
                                className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${priorityBadge.class}`}
                              >
                                {priorityBadge.label}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500">
                              {new Date(lead.created_at).toLocaleDateString('ko-KR', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </div>
                          </div>

                          <div className="mt-2 flex items-center text-sm text-gray-500 space-x-4">
                            <div className="flex items-center">
                              <PhoneIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                              <span>{decryptPhone(lead.phone)}</span>
                            </div>
                            {lead.email && (
                              <div className="flex items-center">
                                <EnvelopeIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                                <span>{lead.email}</span>
                              </div>
                            )}
                            {lead.landing_pages && (
                              <div className="flex items-center">
                                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                                  {lead.landing_pages.title}
                                </span>
                              </div>
                            )}
                          </div>

                          {lead.message && (
                            <p className="mt-2 text-sm text-gray-600 line-clamp-2">{lead.message}</p>
                          )}

                          {lead.users && (
                            <div className="mt-2 text-xs text-gray-500">
                              담당자: {lead.users.name}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
