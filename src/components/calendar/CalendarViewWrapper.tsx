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
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <CalendarDaysIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">DB 스케줄</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              DB 상담 일정과 약속을 관리합니다
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 뷰 모드 토글 */}
          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <CalendarDaysIcon className="h-3.5 w-3.5" />
              월별 캘린더
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <ListBulletIcon className="h-3.5 w-3.5" />
              주별 리스트
            </button>
          </div>

          {/* 총 예약 건수 */}
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-semibold bg-indigo-100 text-indigo-800 gap-1">
            <span className="text-lg font-bold">{reservationCount}</span>
            <span className="text-xs">건</span>
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
