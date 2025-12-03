'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  PlusIcon,
  PhoneIcon,
  UserGroupIcon,
  ClockIcon,
  UserIcon,
} from '@heroicons/react/24/outline'
import EventModal from './EventModal'

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
}

interface CalendarViewProps {
  events: any[]
  leads: Lead[]
  teamMembers: any[]
  currentUserId: string
  statusFilter?: string
}

type ViewMode = 'month' | 'week' | 'day'

const EVENT_COLORS = {
  call: 'bg-blue-100 border-blue-500 text-blue-900',
  meeting: 'bg-purple-100 border-purple-500 text-purple-900',
  consultation: 'bg-green-100 border-green-500 text-green-900',
  task: 'bg-yellow-100 border-yellow-500 text-yellow-900',
  other: 'bg-gray-100 border-gray-500 text-gray-900',
}

const LEAD_STATUS_COLORS = {
  new: 'bg-orange-100 border-orange-500 text-orange-900',
  contacted: 'bg-sky-100 border-sky-500 text-sky-900',
  qualified: 'bg-emerald-100 border-emerald-500 text-emerald-900',
  converted: 'bg-teal-100 border-teal-500 text-teal-900',
  contract_completed: 'bg-emerald-100 border-emerald-500 text-emerald-900',
  lost: 'bg-red-100 border-red-500 text-red-900',
}

const STATUS_LABELS: { [key: string]: string } = {
  new: '신규',
  contacted: '연락완료',
  qualified: '상담예정',
  converted: '전환완료',
  contract_completed: '계약완료',
  lost: '이탈',
}

export default function CalendarView({
  events,
  leads,
  teamMembers,
  currentUserId,
  statusFilter,
}: CalendarViewProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [showEventModal, setShowEventModal] = useState(false)
  const [showDayDetailModal, setShowDayDetailModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [selectedDayData, setSelectedDayData] = useState<{ events: any[], leads: Lead[], day: number } | null>(null)

  // Get days in month
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    return { daysInMonth, startingDayOfWeek, year, month }
  }

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(currentDate)

  // Navigate months
  const previousMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const today = () => {
    setCurrentDate(new Date())
  }

  // Get events for a specific day
  const getEventsForDay = (day: number) => {
    const targetDate = new Date(year, month, day)
    return events.filter((event) => {
      const eventDate = new Date(event.start_time)
      return (
        eventDate.getFullYear() === targetDate.getFullYear() &&
        eventDate.getMonth() === targetDate.getMonth() &&
        eventDate.getDate() === targetDate.getDate()
      )
    })
  }

  // Get leads for a specific day (by contract_completed_at for contract_completed status, otherwise preferred_date or created_at)
  const getLeadsForDay = (day: number) => {
    const targetDate = new Date(year, month, day)
    return leads.filter((lead) => {
      // For contract_completed status, use contract_completed_at date
      if (lead.status === 'contract_completed' && lead.contract_completed_at) {
        const completedDate = new Date(lead.contract_completed_at)
        return (
          completedDate.getFullYear() === targetDate.getFullYear() &&
          completedDate.getMonth() === targetDate.getMonth() &&
          completedDate.getDate() === targetDate.getDate()
        )
      }
      // Check preferred_date first (if set)
      if (lead.preferred_date) {
        const preferredDate = new Date(lead.preferred_date)
        if (
          preferredDate.getFullYear() === targetDate.getFullYear() &&
          preferredDate.getMonth() === targetDate.getMonth() &&
          preferredDate.getDate() === targetDate.getDate()
        ) {
          return true
        }
      }
      // Otherwise check created_at
      const createdDate = new Date(lead.created_at)
      return (
        createdDate.getFullYear() === targetDate.getFullYear() &&
        createdDate.getMonth() === targetDate.getMonth() &&
        createdDate.getDate() === targetDate.getDate()
      )
    })
  }

  // Check if day is today
  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  // Handle day click - open day detail modal to show all items
  const handleDayClick = (day: number) => {
    const dayEvents = getEventsForDay(day)
    const dayLeads = getLeadsForDay(day)
    setSelectedDayData({ events: dayEvents, leads: dayLeads, day })
    setShowDayDetailModal(true)
  }

  // Handle add event from day detail modal
  const handleAddEventFromDay = (day: number) => {
    const clickedDate = new Date(year, month, day)
    setSelectedDate(clickedDate)
    setSelectedEvent(null)
    setShowDayDetailModal(false)
    setShowEventModal(true)
  }

  // Handle event click
  const handleEventClick = (event: any, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedEvent(event)
    setSelectedDate(null)
    setShowEventModal(true)
  }

  // Generate calendar days
  const calendarDays = []
  for (let i = 0; i < startingDayOfWeek; i++) {
    calendarDays.push(null)
  }
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push(day)
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Filter Banner */}
      {statusFilter && (
        <div className="p-4 bg-emerald-50 border-b border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-emerald-700 font-medium">
              🔍 {STATUS_LABELS[statusFilter] || statusFilter} 필터가 적용되었습니다
            </span>
            <span className="text-sm text-emerald-600">
              ({leads.length}건)
            </span>
          </div>
          <button
            onClick={() => router.push('/dashboard/calendar')}
            className="px-3 py-1 text-sm text-emerald-700 bg-white border border-emerald-300 rounded-lg hover:bg-emerald-100 transition flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            필터 해제
          </button>
        </div>
      )}

      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h2 className="text-lg font-semibold text-gray-900">
              {currentDate.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
            </h2>
            <div className="flex items-center space-x-2">
              <button
                onClick={previousMonth}
                className="p-2 hover:bg-gray-100 rounded-md transition"
              >
                <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
              </button>
              <button
                onClick={today}
                className="px-3 py-1 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition"
              >
                오늘
              </button>
              <button
                onClick={nextMonth}
                className="p-2 hover:bg-gray-100 rounded-md transition"
              >
                <ChevronRightIcon className="h-5 w-5 text-gray-600" />
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* View mode selector */}
            <div className="inline-flex rounded-md shadow-sm">
              <button
                onClick={() => setViewMode('month')}
                className={`px-4 py-2 text-sm font-medium rounded-l-md border ${
                  viewMode === 'month'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                월
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-4 py-2 text-sm font-medium border-t border-b ${
                  viewMode === 'week'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                주
              </button>
              <button
                onClick={() => setViewMode('day')}
                className={`px-4 py-2 text-sm font-medium rounded-r-md border ${
                  viewMode === 'day'
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                일
              </button>
            </div>

            <button
              onClick={() => {
                setSelectedEvent(null)
                setSelectedDate(new Date())
                setShowEventModal(true)
              }}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              <PlusIcon className="-ml-1 mr-2 h-5 w-5" />
              일정 추가
            </button>
          </div>
        </div>
      </div>

      {/* Calendar Grid - Month View */}
      {viewMode === 'month' && (
        <div className="p-6">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-px mb-2">
            {['일', '월', '화', '수', '목', '금', '토'].map((day, index) => (
              <div
                key={day}
                className={`text-center text-sm font-medium py-2 ${
                  index === 0 ? 'text-red-600' : index === 6 ? 'text-blue-600' : 'text-gray-700'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {calendarDays.map((day, index) => {
              if (day === null) {
                return <div key={`empty-${index}`} className="bg-gray-50 min-h-[120px]" />
              }

              const dayEvents = getEventsForDay(day)
              const dayLeads = getLeadsForDay(day)
              const isTodayDay = isToday(day)
              const totalItems = dayEvents.length + dayLeads.length

              return (
                <div
                  key={day}
                  onClick={() => handleDayClick(day)}
                  className="bg-white min-h-[120px] p-2 cursor-pointer hover:bg-gray-50 transition"
                >
                  <div
                    className={`text-sm font-medium mb-1 ${
                      isTodayDay
                        ? 'bg-blue-600 text-white w-7 h-7 rounded-full flex items-center justify-center'
                        : index % 7 === 0
                        ? 'text-red-600'
                        : index % 7 === 6
                        ? 'text-blue-600'
                        : 'text-gray-900'
                    }`}
                  >
                    {day}
                  </div>

                  {/* Events and Leads */}
                  <div className="space-y-1">
                    {/* Display events first (max 2) */}
                    {dayEvents.slice(0, 2).map((event: any) => (
                      <div
                        key={`event-${event.id}`}
                        onClick={(e) => handleEventClick(event, e)}
                        className={`text-xs px-2 py-1 rounded border-l-2 truncate ${
                          EVENT_COLORS[event.event_type as keyof typeof EVENT_COLORS]
                        }`}
                      >
                        {new Date(event.start_time).toLocaleTimeString('ko-KR', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}{' '}
                        {event.title}
                      </div>
                    ))}
                    {/* Display leads (remaining slots from max 3 total) */}
                    {(() => {
                      const eventsShown = Math.min(dayEvents.length, 2)
                      const leadsToShow = Math.max(0, 3 - eventsShown)
                      const displayedLeads = dayLeads.slice(0, leadsToShow)
                      const hiddenCount = totalItems - eventsShown - displayedLeads.length

                      return (
                        <>
                          {displayedLeads.map((lead: Lead) => (
                            <div
                              key={`lead-${lead.id}`}
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/dashboard/leads?id=${lead.id}`)
                              }}
                              className={`text-xs px-2 py-1 rounded border-l-2 truncate flex items-center gap-1 ${
                                LEAD_STATUS_COLORS[lead.status as keyof typeof LEAD_STATUS_COLORS] || LEAD_STATUS_COLORS.new
                              }`}
                            >
                              <UserIcon className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{lead.name}</span>
                            </div>
                          ))}
                          {hiddenCount > 0 && (
                            <div className="text-xs text-indigo-600 font-medium px-2 py-1 bg-indigo-50 rounded hover:bg-indigo-100 transition">
                              +{hiddenCount}개 더보기
                            </div>
                          )}
                        </>
                      )
                    })()}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 space-y-3">
            <div className="flex items-center justify-center space-x-6">
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-blue-100 border-l-2 border-blue-500 rounded"></div>
                <span className="text-sm text-gray-600">전화 상담</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-purple-100 border-l-2 border-purple-500 rounded"></div>
                <span className="text-sm text-gray-600">회의</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-100 border-l-2 border-green-500 rounded"></div>
                <span className="text-sm text-gray-600">대면 상담</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-yellow-100 border-l-2 border-yellow-500 rounded"></div>
                <span className="text-sm text-gray-600">업무</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-gray-100 border-l-2 border-gray-500 rounded"></div>
                <span className="text-sm text-gray-600">기타</span>
              </div>
            </div>
            <div className="flex items-center justify-center space-x-6 pt-2 border-t border-gray-100">
              <span className="text-xs text-gray-500 font-medium">DB 신청:</span>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-orange-100 border-l-2 border-orange-500 rounded"></div>
                <span className="text-sm text-gray-600">신규</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-sky-100 border-l-2 border-sky-500 rounded"></div>
                <span className="text-sm text-gray-600">연락완료</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-emerald-100 border-l-2 border-emerald-500 rounded"></div>
                <span className="text-sm text-gray-600">상담예정</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-teal-100 border-l-2 border-teal-500 rounded"></div>
                <span className="text-sm text-gray-600">전환완료</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Week View - Coming Soon */}
      {viewMode === 'week' && (
        <div className="p-12 text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">주간 보기</h3>
          <p className="mt-1 text-sm text-gray-500">주간 보기 기능은 곧 제공될 예정입니다.</p>
        </div>
      )}

      {/* Day View - Coming Soon */}
      {viewMode === 'day' && (
        <div className="p-12 text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">일간 보기</h3>
          <p className="mt-1 text-sm text-gray-500">일간 보기 기능은 곧 제공될 예정입니다.</p>
        </div>
      )}

      {/* Event Modal */}
      {showEventModal && (
        <EventModal
          event={selectedEvent}
          date={selectedDate}
          teamMembers={teamMembers}
          currentUserId={currentUserId}
          onClose={() => {
            setShowEventModal(false)
            setSelectedEvent(null)
            setSelectedDate(null)
          }}
          onSave={() => {
            setShowEventModal(false)
            setSelectedEvent(null)
            setSelectedDate(null)
            router.refresh()
          }}
        />
      )}

      {/* Day Detail Modal - Shows all events and leads for a specific day */}
      {showDayDetailModal && selectedDayData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">
                    {year}년 {month + 1}월 {selectedDayData.day}일
                  </h3>
                  <p className="text-sm text-indigo-100">
                    일정 {selectedDayData.events.length}개 · DB신청 {selectedDayData.leads.length}개
                  </p>
                </div>
                <button
                  onClick={() => setShowDayDetailModal(false)}
                  className="p-2 hover:bg-white/20 rounded-full transition"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto max-h-[60vh] space-y-4">
              {/* Events Section */}
              {selectedDayData.events.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <ClockIcon className="h-4 w-4" />
                    일정
                  </h4>
                  <div className="space-y-2">
                    {selectedDayData.events.map((event: any) => (
                      <div
                        key={event.id}
                        onClick={() => {
                          setSelectedEvent(event)
                          setShowDayDetailModal(false)
                          setShowEventModal(true)
                        }}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition ${
                          EVENT_COLORS[event.event_type as keyof typeof EVENT_COLORS]
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{event.title}</span>
                          <span className="text-xs">
                            {new Date(event.start_time).toLocaleTimeString('ko-KR', {
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                        {event.description && (
                          <p className="text-sm mt-1 opacity-75 line-clamp-2">{event.description}</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Leads Section */}
              {selectedDayData.leads.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2 flex items-center gap-2">
                    <UserIcon className="h-4 w-4" />
                    DB 신청
                  </h4>
                  <div className="space-y-2">
                    {selectedDayData.leads.map((lead: Lead) => (
                      <div
                        key={lead.id}
                        onClick={() => {
                          setShowDayDetailModal(false)
                          router.push(`/dashboard/leads?id=${lead.id}`)
                        }}
                        className={`p-3 rounded-lg border-l-4 cursor-pointer hover:shadow-md transition ${
                          LEAD_STATUS_COLORS[lead.status as keyof typeof LEAD_STATUS_COLORS] || LEAD_STATUS_COLORS.new
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4" />
                            <span className="font-medium">{lead.name}</span>
                          </div>
                          <span className="text-xs px-2 py-1 bg-white/50 rounded">
                            {STATUS_LABELS[lead.status] || lead.status}
                          </span>
                        </div>
                        <p className="text-sm mt-1 opacity-75">{lead.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Empty State */}
              {selectedDayData.events.length === 0 && selectedDayData.leads.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <ClockIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>이 날에는 일정이나 신청이 없습니다</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => handleAddEventFromDay(selectedDayData.day)}
                className="w-full py-3 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition flex items-center justify-center gap-2"
              >
                <PlusIcon className="h-5 w-5" />
                새 일정 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
