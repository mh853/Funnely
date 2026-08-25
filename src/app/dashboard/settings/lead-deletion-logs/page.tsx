// DB(리드) 삭제 이력 조회 페이지 - 관리자 전용 (Notion 29번 항목)
import { createClient, getCachedUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeftIcon, TrashIcon } from '@heroicons/react/24/outline'
import { isAdminUser } from '@/lib/auth/permissions'

// UTC 타임스탬프를 KST 기준 "YYYY-MM-DD HH:mm"으로 표시. 서버(Vercel=UTC)에서 렌더링되므로
// Date의 로컬 getter(getFullYear 등)를 그대로 쓰면 KST가 아니라 UTC로 표시되는 버그가 난다.
function formatKSTDateTime(dateStr: string): string {
  const kst = new Date(new Date(dateStr).getTime() + 9 * 60 * 60 * 1000)
  const y = kst.getUTCFullYear()
  const m = String(kst.getUTCMonth() + 1).padStart(2, '0')
  const d = String(kst.getUTCDate()).padStart(2, '0')
  const hh = String(kst.getUTCHours()).padStart(2, '0')
  const mm = String(kst.getUTCMinutes()).padStart(2, '0')
  return `${y}-${m}-${d} ${hh}:${mm}`
}

export default async function LeadDeletionLogsPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await getCachedUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: userProfile } = await supabase
    .from('users')
    .select('company_id, simple_role, role')
    .eq('id', user.id)
    .maybeSingle()

  if (!userProfile?.company_id) {
    return (
      <div className="text-center py-12">
        <div className="rounded-md bg-red-50 p-4 max-w-md mx-auto">
          <p className="text-sm text-red-700">회사 정보를 찾을 수 없습니다.</p>
        </div>
      </div>
    )
  }

  const canView = isAdminUser(userProfile)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const logs = canView
    ? (
        await db
          .from('lead_deletion_logs')
          .select('id, deleted_count, created_at, deleted_by_user:users!lead_deletion_logs_deleted_by_fkey(full_name, email)')
          .eq('company_id', userProfile.company_id)
          .order('created_at', { ascending: false })
          .limit(100)
      ).data || []
    : []

  return (
    <div className="px-4 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/settings"
          className="p-2 hover:bg-gray-100 rounded-lg transition flex-shrink-0"
        >
          <ArrowLeftIcon className="h-5 w-5 text-gray-600" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-rose-500 to-red-600 rounded-xl shadow-lg">
            <TrashIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">DB 삭제 이력</h1>
            <p className="text-xs text-gray-500 mt-0.5">DB 현황에서 리드(DB)를 삭제한 이력을 확인합니다</p>
          </div>
        </div>
      </div>

      {!canView ? (
        <div className="rounded-md bg-yellow-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-yellow-700">DB 삭제 이력을 조회하려면 관리자 권한이 필요합니다.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-100">
          {logs.length === 0 ? (
            <div className="text-center py-16">
              <TrashIcon className="h-10 w-10 text-gray-200 mx-auto mb-3" />
              <p className="text-sm text-gray-400">아직 삭제 이력이 없습니다.</p>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">날짜</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">계정</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">삭제 건수</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {logs.map((log: any) => (
                  <tr key={log.id}>
                    <td className="px-6 py-3 text-sm text-gray-700 whitespace-nowrap">
                      {formatKSTDateTime(log.created_at)}
                    </td>
                    <td className="px-6 py-3 text-sm text-gray-700">
                      {log.deleted_by_user?.full_name || '탈퇴한 사용자'}
                      {log.deleted_by_user?.email && (
                        <span className="text-gray-400"> ({log.deleted_by_user.email})</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-sm font-medium text-gray-900">{log.deleted_count}건</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
