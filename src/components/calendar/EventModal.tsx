'use client'

import { useState, useEffect, Fragment } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline'

interface EventModalProps {
  event?: any
  date?: Date | null
  teamMembers: any[]
  currentUserId: string
  onClose: () => void
  onSave: () => void
}

const EVENT_TYPES = [
  { value: 'call', label: '전화 상담', color: 'blue' },
  { value: 'meeting', label: '회의', color: 'purple' },
  { value: 'consultation', label: '대면 상담', color: 'green' },
  { value: 'task', label: '업무', color: 'yellow' },
  { value: 'other', label: '기타', color: 'gray' },
]

export default function EventModal({
  event,
  date,
  teamMembers,
  currentUserId,
  onClose,
  onSave,
}: EventModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    event_type: 'call',
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
        assigned_to: event.assigned_to || currentUserId,
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

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: event?.id,
          ...formData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
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
          <div className="fixed inset-0 bg-black bg-opacity-25" />
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
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <Dialog.Title as="h3" className="text-lg font-medium text-gray-900">
                    {event ? '일정 수정' : '새 일정 추가'}
                  </Dialog.Title>
                  <div className="flex items-center space-x-2">
                    {event && (
                      <button
                        onClick={handleDelete}
                        disabled={loading}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-md transition disabled:opacity-50"
                      >
                        <TrashIcon className="h-5 w-5" />
                      </button>
                    )}
                    <button
                      onClick={onClose}
                      className="p-2 text-gray-400 hover:bg-gray-100 rounded-md transition"
                    >
                      <XMarkIcon className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="mb-6 rounded-md bg-red-50 p-4">
                    <p className="text-sm text-red-800">{error}</p>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                      제목 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="title"
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="일정 제목"
                    />
                  </div>

                  {/* Event Type */}
                  <div>
                    <label htmlFor="event_type" className="block text-sm font-medium text-gray-700">
                      일정 유형 <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="event_type"
                      value={formData.event_type}
                      onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {EVENT_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="start_time" className="block text-sm font-medium text-gray-700">
                        시작 시간 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="start_time"
                        required
                        value={formData.start_time}
                        onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label htmlFor="end_time" className="block text-sm font-medium text-gray-700">
                        종료 시간 <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="datetime-local"
                        id="end_time"
                        required
                        value={formData.end_time}
                        onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* All Day */}
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_all_day"
                      checked={formData.is_all_day}
                      onChange={(e) => setFormData({ ...formData, is_all_day: e.target.checked })}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_all_day" className="ml-2 block text-sm text-gray-700">
                      종일
                    </label>
                  </div>

                  {/* Assigned To */}
                  <div>
                    <label htmlFor="assigned_to" className="block text-sm font-medium text-gray-700">
                      담당자
                    </label>
                    <select
                      id="assigned_to"
                      value={formData.assigned_to}
                      onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    >
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} ({member.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Location */}
                  <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700">
                      장소
                    </label>
                    <input
                      type="text"
                      id="location"
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="회의실, 주소 등"
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                      설명
                    </label>
                    <textarea
                      id="description"
                      rows={4}
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      placeholder="일정에 대한 상세 설명"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-md transition"
                    >
                      취소
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition disabled:opacity-50"
                    >
                      {loading ? '저장 중...' : event ? '수정' : '추가'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  )
}
