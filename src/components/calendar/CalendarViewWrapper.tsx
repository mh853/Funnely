'use client'

import { useState } from 'react'
import {
  CalendarDaysIcon,
  ListBulletIcon,
} from '@heroicons/react/24/outline'
import CalendarView from './CalendarView'

interface Lead {
  id: string
  name: string
  phone: string
  status: string
  created_at: string
  preferred_date?: string
  preferred_time?: string
  landing_page_id?: string
  contract_completed_at?: string
  previous_contract_completed_at?: string
}

interface CalendarViewWrapperProps {
  events: any[]
  leads: Lead[]
  teamMembers: any[]
  currentUserId: string
  statusFilter?: string
}

export default function CalendarViewWrapper({
  events,
  leads,
  teamMembers,
  currentUserId,
  statusFilter,
}: CalendarViewWrapperProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar')
  const [reservationCount, setReservationCount] = useState(leads.length)

  return (
    <div className="space-y-4">
      {/* Header - 예약스케줄과 동일한 스타일 */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-5 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">DB 스케줄</h1>
            <p className="mt-1 text-sm text-indigo-100">
              DB 상담 일정과 약속을 관리합니다
            </p>
          </div>
          <div className="flex items-center gap-4">
            {/* 뷰 모드 토글 */}
            <div className="flex items-center bg-white/20 rounded-lg p-1">
              <button
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'calendar'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <CalendarDaysIcon className="h-4 w-4" />
                월별 캘린더
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                  viewMode === 'list'
                    ? 'bg-white text-indigo-600 shadow-sm'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                <ListBulletIcon className="h-4 w-4" />
                주별 리스트
              </button>
            </div>
            {/* 총 예약 건수 */}
            <div className="text-right">
              <div className="text-3xl font-bold">{reservationCount}</div>
              <div className="text-xs text-indigo-100">총 예약 건수</div>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar or List View */}
      <CalendarView
        events={events}
        leads={leads}
        teamMembers={teamMembers}
        currentUserId={currentUserId}
        statusFilter={statusFilter}
        viewMode={viewMode}
        onReservationCountChange={setReservationCount}
      />
    </div>
  )
}
