import { NextResponse } from 'next/server'
import { getAdminDashboardStats } from '@/lib/admin/dashboard-stats'

export async function GET() {
  try {
    const data = await getAdminDashboardStats()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Admin stats API error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch admin statistics' },
      { status: 500 }
    )
  }
}
