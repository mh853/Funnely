'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { CalendarDaysIcon, ChevronLeftIcon, ChevronRightIcon, XMarkIcon } from '@heroicons/react/24/outline'

interface DateRangePickerProps {
  startDate: Date | null
  endDate: Date | null
  onChange: (startDate: Date | null, endDate: Date | null) => void
  placeholder?: string
  className?: string
}

// 빠른 선택 프리셋
const PRESETS = [
  { label: '오늘', days: 0 },
  { label: '최근 7일', days: 7 },
  { label: '최근 14일', days: 14 },
  { label: '최근 30일', days: 30 },
  { label: '전체', days: -1 },
]

// 날짜 포맷 함수
const formatDate = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 입력용 날짜 포맷 (yyyy-mm-dd)
const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

// 문자열을 Date로 파싱
const parseDate = (dateStr: string): Date | null => {
  if (!dateStr) return null
  const parts = dateStr.split('-')
  if (parts.length !== 3) return null
  const year = parseInt(parts[0], 10)
  const month = parseInt(parts[1], 10) - 1
  const day = parseInt(parts[2], 10)
  if (isNaN(year) || isNaN(month) || isNaN(day)) return null
  return new Date(year, month, day)
}

// 두 날짜가 같은 날인지 확인
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  )
}

// 날짜가 범위 내에 있는지 확인
const isInRange = (date: Date, start: Date | null, end: Date | null): boolean => {
  if (!start || !end) return false
  const time = date.getTime()
  return time >= start.getTime() && time <= end.getTime()
}

export default function DateRangePicker({
  startDate,
  endDate,
  onChange,
  placeholder = '날짜 범위 선택',
  className = '',
}: DateRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [leftMonth, setLeftMonth] = useState(new Date())
  const [rightMonth, setRightMonth] = useState(() => {
    const next = new Date()
    next.setMonth(next.getMonth() + 1)
    return next
  })
  const [hoverDate, setHoverDate] = useState<Date | null>(null)
  const [selectingStart, setSelectingStart] = useState(true)
  const [tempStart, setTempStart] = useState<Date | null>(startDate)
  const [tempEnd, setTempEnd] = useState<Date | null>(endDate)

  // 직접 입력 상태
  const [startInput, setStartInput] = useState('')
  const [endInput, setEndInput] = useState('')

  const triggerRef = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  // 드롭다운 위치 계산
  useEffect(() => {
    if (isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect()
      const dropdownWidth = 700 // 대략적인 드롭다운 너비
      const viewportWidth = window.innerWidth

      let left = rect.left + window.scrollX
      // 오른쪽으로 넘어가면 왼쪽으로 조정
      if (left + dropdownWidth > viewportWidth) {
        left = Math.max(10, viewportWidth - dropdownWidth - 10)
      }

      setDropdownPosition({
        top: rect.bottom + window.scrollY + 8,
        left,
      })
    }
  }, [isOpen])

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node) &&
        triggerRef.current &&
        !triggerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
    }
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // 입력 필드 동기화
  useEffect(() => {
    setStartInput(tempStart ? formatDateForInput(tempStart) : '')
    setEndInput(tempEnd ? formatDateForInput(tempEnd) : '')
  }, [tempStart, tempEnd])

  // props 변경 시 임시 상태 동기화
  useEffect(() => {
    setTempStart(startDate)
    setTempEnd(endDate)
  }, [startDate, endDate])

  // 달력 이동
  const navigateMonth = (direction: 'prev' | 'next', calendar: 'left' | 'right') => {
    const setMonth = calendar === 'left' ? setLeftMonth : setRightMonth
    setMonth(prev => {
      const newDate = new Date(prev)
      newDate.setMonth(prev.getMonth() + (direction === 'next' ? 1 : -1))
      return newDate
    })
  }

  // 빠른 선택 적용
  const applyPreset = (days: number) => {
    if (days === -1) {
      // 전체
      setTempStart(null)
      setTempEnd(null)
      onChange(null, null)
      setIsOpen(false)
    } else if (days === 0) {
      // 오늘
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      setTempStart(today)
      setTempEnd(today)
      onChange(today, today)
      setIsOpen(false)
    } else {
      const end = new Date()
      end.setHours(23, 59, 59, 999)
      const start = new Date()
      start.setDate(start.getDate() - days)
      start.setHours(0, 0, 0, 0)
      setTempStart(start)
      setTempEnd(end)
      onChange(start, end)
      setIsOpen(false)
    }
  }

  // 날짜 클릭 핸들러
  const handleDateClick = (date: Date) => {
    if (selectingStart) {
      setTempStart(date)
      setTempEnd(null)
      setSelectingStart(false)
    } else {
      if (date < tempStart!) {
        // 종료일이 시작일보다 이전이면 스왑
        setTempEnd(tempStart)
        setTempStart(date)
      } else {
        setTempEnd(date)
      }
      setSelectingStart(true)
    }
  }

  // 적용 버튼
  const handleApply = () => {
    onChange(tempStart, tempEnd)
    setIsOpen(false)
  }

  // 직접 입력 적용
  const handleInputApply = () => {
    const start = parseDate(startInput)
    const end = parseDate(endInput)

    if (start && end) {
      if (start > end) {
        setTempStart(end)
        setTempEnd(start)
        onChange(end, start)
      } else {
        setTempStart(start)
        setTempEnd(end)
        onChange(start, end)
      }
      setIsOpen(false)
    } else if (start && !endInput) {
      setTempStart(start)
      setTempEnd(start)
      onChange(start, start)
      setIsOpen(false)
    }
  }

  // 달력 렌더링
  const renderCalendar = (monthDate: Date) => {
    const year = monthDate.getFullYear()
    const month = monthDate.getMonth()
    const firstDay = new Date(year, month, 1).getDay()
    const daysInMonth = new Date(year, month + 1, 0).getDate()

    const days: (number | null)[] = []
    for (let i = 0; i < firstDay; i++) {
      days.push(null)
    }
    for (let d = 1; d <= daysInMonth; d++) {
      days.push(d)
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    return (
      <div className="w-64">
        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-gray-500 mb-2">
          {['일', '월', '화', '수', '목', '금', '토'].map(day => (
            <div key={day} className="py-1">{day}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map((day, idx) => {
            if (day === null) {
              return <div key={`empty-${idx}`} className="h-8" />
            }

            const date = new Date(year, month, day)
            date.setHours(0, 0, 0, 0)

            const isToday = isSameDay(date, today)
            const isStart = tempStart && isSameDay(date, tempStart)
            const isEnd = tempEnd && isSameDay(date, tempEnd)
            const inRange = isInRange(date, tempStart, tempEnd)
            const inHoverRange = !tempEnd && tempStart && hoverDate &&
              ((date >= tempStart && date <= hoverDate) || (date <= tempStart && date >= hoverDate))

            return (
              <button
                key={day}
                type="button"
                onClick={() => handleDateClick(date)}
                onMouseEnter={() => setHoverDate(date)}
                onMouseLeave={() => setHoverDate(null)}
                className={`
                  h-8 w-full rounded-lg text-sm font-medium transition-all
                  ${isStart || isEnd
                    ? 'bg-indigo-600 text-white'
                    : inRange || inHoverRange
                      ? 'bg-indigo-100 text-indigo-900'
                      : isToday
                        ? 'bg-gray-100 text-gray-900 font-bold'
                        : 'text-gray-700 hover:bg-gray-100'
                  }
                `}
              >
                {day}
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // 표시 텍스트
  const displayText = startDate && endDate
    ? `${formatDate(startDate)} ~ ${formatDate(endDate)}`
    : startDate
      ? formatDate(startDate)
      : placeholder

  return (
    <>
      {/* 트리거 버튼 */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`
          w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-left
          flex items-center justify-between gap-1
          focus:ring-2 focus:ring-indigo-500 focus:border-transparent
          hover:border-gray-400 transition-colors
          ${className}
        `}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <CalendarDaysIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className={`truncate text-xs ${startDate ? 'text-gray-900' : 'text-gray-500'}`}>
            {displayText}
          </span>
        </div>
        {startDate && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              setTempStart(null)
              setTempEnd(null)
              onChange(null, null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.stopPropagation()
                e.preventDefault()
                setTempStart(null)
                setTempEnd(null)
                onChange(null, null)
              }
            }}
            className="p-1 hover:bg-gray-100 rounded-full cursor-pointer"
          >
            <XMarkIcon className="h-4 w-4 text-gray-400" />
          </span>
        )}
      </button>

      {/* 드롭다운 (Portal) */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="fixed z-50 bg-white rounded-xl shadow-2xl border border-gray-200 p-4"
          style={{
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            maxWidth: '90vw',
          }}
        >
          {/* 빠른 선택 */}
          <div className="flex flex-wrap gap-2 mb-4 pb-4 border-b border-gray-200">
            <span className="text-sm text-gray-600 mr-2 flex items-center">빠른 선택:</span>
            {PRESETS.map(preset => (
              <button
                key={preset.label}
                type="button"
                onClick={() => applyPreset(preset.days)}
                className="px-3 py-1.5 text-sm rounded-lg bg-gray-100 text-gray-700 hover:bg-indigo-100 hover:text-indigo-700 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* 듀얼 캘린더 */}
          <div className="flex flex-col md:flex-row gap-6 mb-4">
            {/* 왼쪽 캘린더 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => navigateMonth('prev', 'left')}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                <span className="text-sm font-semibold text-gray-900">
                  {leftMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                </span>
                <button
                  type="button"
                  onClick={() => navigateMonth('next', 'left')}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              {renderCalendar(leftMonth)}
            </div>

            {/* 오른쪽 캘린더 */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => navigateMonth('prev', 'right')}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronLeftIcon className="h-5 w-5 text-gray-600" />
                </button>
                <span className="text-sm font-semibold text-gray-900">
                  {rightMonth.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long' })}
                </span>
                <button
                  type="button"
                  onClick={() => navigateMonth('next', 'right')}
                  className="p-1 hover:bg-gray-100 rounded-lg"
                >
                  <ChevronRightIcon className="h-5 w-5 text-gray-600" />
                </button>
              </div>
              {renderCalendar(rightMonth)}
            </div>
          </div>

          {/* 직접 입력 */}
          <div className="pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-600">직접 입력:</span>
              <input
                type="date"
                value={startInput}
                onChange={(e) => setStartInput(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <span className="text-gray-400">~</span>
              <input
                type="date"
                value={endInput}
                onChange={(e) => setEndInput(e.target.value)}
                className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
              <button
                type="button"
                onClick={handleInputApply}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                적용
              </button>
            </div>
          </div>

          {/* 선택된 범위 표시 및 적용 버튼 */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {tempStart && tempEnd ? (
                <span className="text-indigo-600 font-medium">
                  {formatDate(tempStart)} ~ {formatDate(tempEnd)}
                </span>
              ) : tempStart ? (
                <span className="text-orange-500">종료일을 선택하세요</span>
              ) : (
                <span className="text-gray-400">시작일을 선택하세요</span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                type="button"
                onClick={handleApply}
                disabled={!tempStart || !tempEnd}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                적용
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
