import { getAdminDashboardStats } from '@/lib/admin/dashboard-stats'
import DashboardWidgets from './DashboardWidgets'

interface MonthStats {
  signups: number
  trials: number
  payments: number
  revenue: number
  withdrawals: number
  cancellations: number
  tickets: number
  leads: number
}

interface DashboardData {
  thisMonth: MonthStats
  lastMonth: MonthStats
  recent: {
    signups: Array<{ id: string; name: string; date: string }>
    payments: Array<{ id: string; companyName: string; amount: number; date: string }>
    withdrawals: Array<{ id: string; name: string; date: string }>
    cancellations: Array<{ id: string; companyName: string; date: string }>
    tickets: Array<{ id: string; subject: string; companyName: string; date: string }>
  }
}

export default async function AdminDashboard() {
  const data: DashboardData = await getAdminDashboardStats()
  const now = new Date()

  return (
    <div className="space-y-8">
      {/* Page header */}
      <div className="bg-gradient-to-r from-indigo-600 to-blue-500 rounded-2xl px-7 py-6 shadow-lg shadow-indigo-100">
        <p className="text-indigo-200 text-xs font-semibold uppercase tracking-widest mb-1">Dashboard</p>
        <h2 className="text-2xl font-bold text-white">대시보드</h2>
        <p className="text-indigo-200 text-sm mt-1">
          {now.getFullYear()}년 {now.getMonth() + 1}월 현황
        </p>
      </div>

      {/* 통계/최신현황 위젯 - /admin/settings/dashboard에서 저장한 표시·순서 설정을
          반영한다(53차 QA: 이전엔 완전히 무관했음) */}
      <DashboardWidgets data={data} />
    </div>
  )
}
