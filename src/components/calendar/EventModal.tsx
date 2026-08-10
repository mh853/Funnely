'use client'

import { useState, useEffect, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, TrashIcon, ChevronDownIcon } from '@heroicons/react/24/outline'

interface EventModalProps {
  event?: any
  date?: Date | null
  teamMembers: any[]
  currentUserId: string
  onClose: () => void
  onSave: () => void
}

// DB현황(리드 상태)의 코드값을 그대로 복사해뒀었는데, calendar_events.event_type은
// 리드 상태와 무관한 별도 Postgres enum(consultation/callback/meeting/task/reminder,
// 20250114000000_add_landing_page_system.sql:34-40)이다 - 여기서 보내는 값 중
// 어떤 것도 그 enum에 속하지 않아 일정 저장이 항상 22P02(enum 위반)로 실패했다
// (85차 QA, 실DB에 calendar_events 행이 0건이었던 것으로 재확인). 실제 enum 값으로 교체.
const EVENT_TYPES = [
  { value: 'consultation', label: '상담', color: 'green', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300' },
  { value: 'callback', label: '재연락', color: 'blue', bg: 'bg-blue-100', text: 'text-blue-700', border: 'border-blue-300' },
  { value: 'meeting', label: '미팅', color: 'purple', bg: 'bg-purple-100', text: 'text-purple-700', border: 'border-purple-300' },
  { value: 'task', label: '업무', color: 'yellow', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300' },
  { value: 'reminder', label: '리마인더', color: 'amber', bg: 'bg-amber-100', text: 'text-amber-700', border: 'border-amber-300' },
]

// 빠른 시간 선택 옵션
const QUICK_TIMES = ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00', '18:00']

export default function EventModal({
  event,
  date,
  teamMembers,
  currentUserId,
  onClose,
  onSave,
}: EventModalProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'consultation',
    start_time: '',
    end_time: '',
    assigned_to: currentUserId,
    lead_id: '',
    location: '',
    is_all_day: false,
  })

  useEffect(() => {
    if (event) {
      // Edit mode
      const startTime = new Date(event.start_time)
      const endTime = new Date(event.end_time)

      setFormData({
        title: event.title,
        description: event.description || '',
        event_type: event.event_type,
        start_time: formatDateTimeLocal(startTime),
        end_time: formatDateTimeLocal(endTime),
        // calendar_events.assigned_to는 배열(UUID[]) 컬럼이라 DB에서 내려온 값도
        // 배열이다 - 단일 select에 쓰려면 첫 번째 담당자만 꺼내야 한다
        assigned_to: (Array.isArray(event.assigned_to) ? event.assigned_to[0] : event.assigned_to) || currentUserId,
        lead_id: event.lead_id || '',
        location: event.location || '',
        is_all_day: event.is_all_day || false,
      })
    } else if (date) {
      // Create mode with selected date
      const startTime = new Date(date)
      startTime.setHours(9, 0, 0, 0) // Default to 9 AM

      const endTime = new Date(date)
      endTime.setHours(10, 0, 0, 0) // Default to 10 AM

      setFormData({
        ...formData,
        start_time: formatDateTimeLocal(startTime),
        end_time: formatDateTimeLocal(endTime),
      })
    }
  }, [event, date])

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day}T${hours}:${minutes}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = event ? '/api/calendar/events/update' : '/api/calendar/events'
      const method = event ? 'PUT' : 'POST'

      // datetime-local input은 타임존 정보가 없는 "YYYY-MM-DDTHH:mm" 문자열만 다룬다
      // (HTML 표준 제약) - 이 값을 그대로 TIMESTAMPTZ 컬럼에 보내면 서버가 UTC로 해석해
      // KST 대비 9시간 밀려 저장된다(같은 회사의 리드 예약일시는 이미 +09:00을 명시하는
      // 것과 동일 패턴, 78차 QA). 전송 직전에만 KST 오프셋을 붙인다.
      const toKSTIso = (v: string) => (v ? `${v}:00+09:00` : v)

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: event?.id,
          ...formData,
          start_time: toKSTIso(formData.start_time),
          end_time: toKSTIso(formData.end_time),
          expected_updated_at: event?.updated_at,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        // 낙관적 동시성 충돌(409) - 모달은 열어둔 채 오류만 보여주고, 백그라운드로
        // router.refresh()를 호출해 두면 사용자가 모달을 닫고 다시 열었을 때는
        // 최신 데이터를 보게 된다(list-level 핸들러와 동일한 패턴).
        if (res.status === 409) {
          router.refresh()
        }
        throw new Error(data.error?.message || '일정 저장 실패')
      }

      onSave()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!event || !confirm('정말로 이 일정을 삭제하시겠습니까?')) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/calendar/events/delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: event.id }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '일정 삭제 실패')
      }

      onSave()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // 현재 선택된 일정 유형 정보
  const selectedEventType = EVENT_TYPES.find(t => t.value === formData.event_type) || EVENT_TYPES[0]

  // 시작 시간에서 시간만 추출
  const getTimeFromDateTime = (dateTimeStr: string) => {
    if (!dateTimeStr) return ''
    const timePart = dateTimeStr.split('T')[1]
    return timePart ? timePart.substring(0, 5) : ''
  }

  // 빠른 시간 선택 핸들러
  const handleQuickTimeSelect = (time: string) => {
    if (!formData.start_time) return
    const datePart = formData.start_time.split('T')[0]
    const newStartTime = `${datePart}T${time}`
    // 종료 시간은 시작 시간 + 1시간
    const [hour, minute] = time.split(':').map(Number)
    const endHour = hour + 1
    const newEndTime = `${datePart}T${String(endHour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
    setFormData({ ...formData, start_time: newStartTime, end_time: newEndTime })
  }

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white text-left align-middle shadow-2xl transition-all">
                {/* Header with Gradient */}
                <div className="p-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                  <div className="flex items-center justify-between">
                    <div>
                      <Dialog.Title as="h3" className="text-lg font-bold">
                        {event ? '일정 수정' : '새 일정 추가'}
                      </Dialog.Title>
                      <p className="text-sm text-indigo-100">
                        {formData.start_time && new Date(formData.start_time).toLocaleDateString('ko-KR', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          weekday: 'long',
                        })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {event && (
                        <button
                          onClick={handleDelete}
                          disabled={loading}
                          className="p-2 hover:bg-white/20 rounded-full transition disabled:opacity-50"
                        >
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      )}
                      <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/20 rounded-full transition"
                      >
                        <XMarkIcon className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mx-6 mt-4 rounded-lg bg-red-50 border border-red-200 p-3">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
                  {/* Event Type - Button Group Style (DB현황 상태와 동일) */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      일정 유형 <span className="text-red-500">*</span>
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {EVENT_TYPES.map((type) => (
                        <button
                          key={type.value}
                          type="button"
                          onClick={() => setFormData({ ...formData, event_type: type.value })}
                          className={`py-2.5 px-2 rounded-lg text-xs font-medium transition-all border ${
                            formData.event_type === type.value
                              ? `${type.bg} ${type.text} ${type.border} ring-2 ring-offset-1 ring-${type.color}-400`
                              : 'bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {type.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      제목 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="일정 제목을 입력하세요"
                    />
                  </div>

                  {/* Quick Time Selection */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      빠른 시간 선택
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {QUICK_TIMES.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => handleQuickTimeSelect(time)}
                          className={`py-2 px-2 rounded-lg text-sm font-medium transition-all ${
                            getTimeFromDateTime(formData.start_time) === time
                              ? 'bg-indigo-100 text-indigo-700 ring-2 ring-indigo-500'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time - Compact */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="start_time" className="block text-sm font-medium text-gray-700 mb-2">
                        시작 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="start_time"
                        required
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="end_time" className="block text-sm font-medium text-gray-700 mb-2">
                        종료 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="end_time"
                        required
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {/* All Day Toggle */}
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      id="is_all_day"
                      checked={formData.is_all_day}
                      onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_all_day" className="text-sm text-gray-700">
                      종일 일정으로 설정
                    </label>
                  </div>

                  {/* Assigned To */}
                  <div>
                    <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700 mb-2">
                      담당자
                    </label>
                    <div className="relative">
                      <select
                        id="assigned_to"
                        value={formData.assigned_to}
                        onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 appearance-none pr-10"
                      >
                        {teamMembers.map((member) => (
                          <option key={member.id} value={member.id}>
                            {member.full_name}
                          </option>
                        ))}
                      </select>
                      <ChevronDownIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  {/* Location - 주석처리 */}
                  {/* <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-2">
                      장소
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="회의실, 주소 등"
                    />
                  </div> */}

                  {/* 비고 - DB현황 스타일과 동일 */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      비고
                    </label>
                    <textarea
                      id="description"
                      rows={3}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all text-gray-900 text-sm resize-none"
                      placeholder="비고를 입력하세요..."
                    />
                  </div>
                </form>

                {/* Footer Actions */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                  >
                    취소
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    )}
                    {loading ? '저장 중...' : event ? '수정' : '일정 추가'}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
