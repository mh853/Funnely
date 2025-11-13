import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportGenerator from '@/components/reports/ReportGenerator'
import RecentReports from '@/components/reports/RecentReports'

export default async function ReportsPage() {
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

  // Get campaigns for report generation
  const { data: campaigns } = await supabase
    .from('campaigns')
    .select(`
      id,
      campaign_name,
      status,
      ad_accounts (
        platform,
        account_name
      )
    `)
    .eq('hospital_id', userProfile.hospital_id)
    .order('created_at', { ascending: false })

  // Get recent reports
  const { data: reports } = await supabase
    .from('reports')
    .select('*')
    .eq('hospital_id', userProfile.hospital_id)
    .order('created_at', { ascending: false })
    .limit(10)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">리포트</h1>
        <p className="mt-1 text-sm text-gray-600">
          광고 성과 리포트를 생성하고 다운로드합니다.
        </p>
      </div>

      {/* Report Generator */}
      <ReportGenerator campaigns={(campaigns as any) || []} hospitalId={userProfile.hospital_id} />

      {/* Recent Reports */}
      <RecentReports reports={reports || []} hospitalId={userProfile.hospital_id} />
    </div>
  )
}
