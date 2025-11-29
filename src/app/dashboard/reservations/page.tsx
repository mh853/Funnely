import { createClient, getCachedUserProfile } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { decryptPhone } from '@/lib/encryption/phone'

export default async function ReservationsPage() {
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

  // Get contract completed leads with scheduled dates
  const { data: contractLeads } = await supabase
    .from('leads')
    .select(
      `
      *,
      landing_pages (
        id,
        title,
        slug
      )
    `
    )
    .eq('company_id', userProfile.company_id)
    .eq('status', 'contract_completed')
    .not('contract_completed_at', 'is', null)
    .order('contract_completed_at', { ascending: true })

  // Group leads by date
  const leadsByDate: { [key: string]: any[] } = {}
  contractLeads?.forEach((lead) => {
    if (lead.contract_completed_at) {
      const date = new Date(lead.contract_completed_at).toISOString().split('T')[0]
      if (!leadsByDate[date]) {
        leadsByDate[date] = []
      }
      leadsByDate[date].push(lead)
    }
  })

  // Sort dates
  const sortedDates = Object.keys(leadsByDate).sort()

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">예약 스케줄</h1>
            <p className="mt-2 text-emerald-100">
              계약 완료된 예약 일정을 관리합니다
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{contractLeads?.length || 0}</div>
            <div className="text-sm text-emerald-100">총 예약 건수</div>
          </div>
        </div>
      </div>

      {/* Schedule List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {sortedDates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-lg mb-2">예약된 일정이 없습니다</div>
            <p className="text-sm text-gray-500">
              계약 완료 시 날짜/시간을 지정하면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedDates.map((date) => {
              const leads = leadsByDate[date]
              const dateObj = new Date(date)
              const formattedDate = dateObj.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })

              return (
                <div key={date} className="p-6 hover:bg-gray-50 transition-colors">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">
                          {dateObj.getDate()}
                        </div>
                        <div className="text-xs text-emerald-600">
                          {dateObj.toLocaleDateString('ko-KR', { month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formattedDate}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {leads.length}건의 예약
                      </p>
                    </div>
                  </div>

                  {/* Reservation Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-0 md:ml-20">
                    {leads.map((lead) => {
                      const time = new Date(lead.contract_completed_at).toLocaleTimeString(
                        'ko-KR',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                      const phone = lead.phone ? decryptPhone(lead.phone) : null

                      return (
                        <Link
                          key={lead.id}
                          href={`/dashboard/leads?status=contract_completed&search=${encodeURIComponent(lead.name)}`}
                          className="group relative bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-500 hover:shadow-lg transition-all duration-200"
                        >
                          {/* Time Badge */}
                          <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            {time}
                          </div>

                          {/* Lead Info */}
                          <div className="space-y-2">
                            <div className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                              {lead.name}
                            </div>

                            {lead.landing_pages?.title && (
                              <div className="text-xs text-gray-500">
                                📄 {lead.landing_pages.title}
                              </div>
                            )}

                            {/* Contact Info - Shows on Hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {phone && (
                                <div className="text-sm text-emerald-600 font-medium">
                                  📞 {phone}
                                </div>
                              )}
                              {lead.custom_field_1 && (
                                <div className="text-xs text-gray-600">
                                  {lead.custom_field_1}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hover Indicator */}
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg
                              className="w-5 h-5 text-emerald-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-4">
        <Link
          href="/dashboard/leads?status=contract_completed"
          className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-emerald-600 bg-white border-2 border-emerald-600 rounded-full hover:bg-emerald-50 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          모든 계약 완료 건 보기
        </Link>
        <Link
          href="/dashboard/calendar"
          className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          캘린더 뷰로 보기
        </Link>
      </div>
    </div>
  )
}
