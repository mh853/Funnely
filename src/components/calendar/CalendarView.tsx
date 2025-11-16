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
} from '@heroicons/react/24/outline'
import EventModal from './EventModal'

interface CalendarViewProps {
  events: any[]
  teamMembers: any[]
  currentUserId: string
}

type ViewMode = 'month' | 'week' | 'day'

const EVENT_COLORS = {
  call: 'bg-blue-100 border-blue-500 text-blue-900',
  meeting: 'bg-purple-100 border-purple-500 text-purple-900',
  consultation: 'bg-green-100 border-green-500 text-green-900',
  task: 'bg-yellow-100 border-yellow-500 text-yellow-900',
  other: 'bg-gray-100 border-gray-500 text-gray-900',
}

export default function CalendarView({
  events,
  teamMembers,
  currentUserId,
}: CalendarViewProps) {
  const router = useRouter()
  const [currentDate, setCurrentDate] = useState(new Date())
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [showEventModal, setShowEventModal] = useState(false)
  const [selectedEvent, setSelectedEvent] = useState<any>(null)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

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

  // Check if day is today
  const isToday = (day: number) => {
    const today = new Date()
    return (
      today.getFullYear() === year &&
      today.getMonth() === month &&
      today.getDate() === day
    )
  }

  // Handle day click
  const handleDayClick = (day: number) => {
    const clickedDate = new Date(year, month, day)
    setSelectedDate(clickedDate)
    setSelectedEvent(null)
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
              const isTodayDay = isToday(day)

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

                  {/* Events */}
                  <div className="space-y-1">
                    {dayEvents.slice(0, 3).map((event: any) => (
                      <div
                        key={event.id}
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
                    {dayEvents.length > 3 && (
                      <div className="text-xs text-gray-500 px-2">+{dayEvents.length - 3} 더보기</div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Legend */}
          <div className="mt-6 flex items-center justify-center space-x-6">
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
    </div>
  )
}
