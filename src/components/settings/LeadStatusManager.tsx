'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ArrowsUpDownIcon,
  CheckIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline'

interface LeadStatus {
  id: string
  code: string
  label: string
  color: string
  sort_order: number
  is_default: boolean
  is_active: boolean
}

const COLOR_OPTIONS = [
  { value: 'gray', label: '회색', bg: 'bg-gray-100', text: 'text-gray-800' },
  { value: 'red', label: '빨강', bg: 'bg-red-100', text: 'text-red-800' },
  { value: 'orange', label: '주황', bg: 'bg-orange-100', text: 'text-orange-800' },
  { value: 'yellow', label: '노랑', bg: 'bg-yellow-100', text: 'text-yellow-800' },
  { value: 'green', label: '초록', bg: 'bg-green-100', text: 'text-green-800' },
  { value: 'emerald', label: '에메랄드', bg: 'bg-emerald-100', text: 'text-emerald-800' },
  { value: 'sky', label: '하늘', bg: 'bg-sky-100', text: 'text-sky-800' },
  { value: 'blue', label: '파랑', bg: 'bg-blue-100', text: 'text-blue-800' },
  { value: 'purple', label: '보라', bg: 'bg-purple-100', text: 'text-purple-800' },
  { value: 'pink', label: '분홍', bg: 'bg-pink-100', text: 'text-pink-800' },
]

function getColorClasses(color: string) {
  const colorOption = COLOR_OPTIONS.find(c => c.value === color)
  return colorOption || COLOR_OPTIONS[0]
}

export default function LeadStatusManager({ canEdit }: { canEdit: boolean }) {
  const [statuses, setStatuses] = useState<LeadStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState({ label: '', color: 'gray' })
  const [showAddForm, setShowAddForm] = useState(false)
  const [newStatus, setNewStatus] = useState({ code: '', label: '', color: 'gray' })
  const [error, setError] = useState<string | null>(null)

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await fetch('/api/lead-statuses')
      const data = await res.json()
      if (data.success) {
        setStatuses(data.data)
      }
    } catch (err) {
      console.error('Failed to fetch statuses:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStatuses()
  }, [fetchStatuses])

  const handleAdd = async () => {
    if (!newStatus.code || !newStatus.label) {
      setError('코드와 이름을 모두 입력해주세요.')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/lead-statuses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStatus),
      })
      const data = await res.json()

      if (data.success) {
        setStatuses([...statuses, data.data])
        setShowAddForm(false)
        setNewStatus({ code: '', label: '', color: 'gray' })
      } else {
        setError(data.error?.message || '추가에 실패했습니다.')
      }
    } catch (err) {
      setError('추가에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async (id: string) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/lead-statuses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...editForm }),
      })
      const data = await res.json()

      if (data.success) {
        setStatuses(statuses.map(s => s.id === id ? data.data : s))
        setEditingId(null)
      } else {
        setError(data.error?.message || '수정에 실패했습니다.')
      }
    } catch (err) {
      setError('수정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`"${label}" 상태를 삭제하시겠습니까?`)) return

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/lead-statuses?id=${id}`, {
        method: 'DELETE',
      })
      const data = await res.json()

      if (data.success) {
        if (data.soft_deleted) {
          // Refresh to get updated list
          fetchStatuses()
          alert(data.message)
        } else {
          setStatuses(statuses.filter(s => s.id !== id))
        }
      } else {
        setError(data.error?.message || '삭제에 실패했습니다.')
      }
    } catch (err) {
      setError('삭제에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleSetDefault = async (id: string) => {
    setSaving(true)
    setError(null)

    try {
      const res = await fetch('/api/lead-statuses', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, is_default: true }),
      })
      const data = await res.json()

      if (data.success) {
        setStatuses(statuses.map(s => ({
          ...s,
          is_default: s.id === id,
        })))
      } else {
        setError(data.error?.message || '기본값 설정에 실패했습니다.')
      }
    } catch (err) {
      setError('기본값 설정에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleMoveUp = async (index: number) => {
    if (index === 0) return

    const newStatuses = [...statuses]
    const temp = newStatuses[index]
    newStatuses[index] = newStatuses[index - 1]
    newStatuses[index - 1] = temp

    setStatuses(newStatuses)
    await saveOrder(newStatuses)
  }

  const handleMoveDown = async (index: number) => {
    if (index === statuses.length - 1) return

    const newStatuses = [...statuses]
    const temp = newStatuses[index]
    newStatuses[index] = newStatuses[index + 1]
    newStatuses[index + 1] = temp

    setStatuses(newStatuses)
    await saveOrder(newStatuses)
  }

  const saveOrder = async (orderedStatuses: LeadStatus[]) => {
    try {
      await fetch('/api/lead-statuses/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderedIds: orderedStatuses.map(s => s.id) }),
      })
    } catch (err) {
      console.error('Failed to save order:', err)
    }
  }

  const startEdit = (status: LeadStatus) => {
    setEditingId(status.id)
    setEditForm({ label: status.label, color: status.color })
  }

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="h-12 bg-gray-100 rounded-lg" />
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium text-gray-900">리드 상태 관리</h3>
          <p className="text-sm text-gray-500 mt-1">
            DB현황 페이지의 결과 컬럼에 표시되는 상태 항목을 관리합니다.
          </p>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAddForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition"
          >
            <PlusIcon className="h-4 w-4" />
            상태 추가
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 border border-indigo-200 bg-indigo-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">새 상태 추가</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">코드 (영문)</label>
              <input
                type="text"
                value={newStatus.code}
                onChange={e => setNewStatus({ ...newStatus, code: e.target.value })}
                placeholder="예: waiting"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">표시 이름</label>
              <input
                type="text"
                value={newStatus.label}
                onChange={e => setNewStatus({ ...newStatus, label: e.target.value })}
                placeholder="예: 대기 중"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">색상</label>
              <select
                value={newStatus.color}
                onChange={e => setNewStatus({ ...newStatus, color: e.target.value })}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                {COLOR_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewStatus({ code: '', label: '', color: 'gray' })
                setError(null)
              }}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900"
            >
              취소
            </button>
            <button
              onClick={handleAdd}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? '추가 중...' : '추가'}
            </button>
          </div>
        </div>
      )}

      {/* Status List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {canEdit && (
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 w-20">
                  <ArrowsUpDownIcon className="h-4 w-4" />
                </th>
              )}
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">미리보기</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">코드</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">표시 이름</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">기본값</th>
              {canEdit && (
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 w-32">작업</th>
              )}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {statuses.map((status, index) => {
              const colorClasses = getColorClasses(status.color)
              const isEditing = editingId === status.id

              return (
                <tr key={status.id} className="hover:bg-gray-50">
                  {canEdit && (
                    <td className="px-3 py-2">
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => handleMoveUp(index)}
                          disabled={index === 0 || saving}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronUpIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleMoveDown(index)}
                          disabled={index === statuses.length - 1 || saving}
                          className="p-0.5 text-gray-400 hover:text-gray-600 disabled:opacity-30"
                        >
                          <ChevronDownIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  )}
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getColorClasses(editForm.color).bg} ${getColorClasses(editForm.color).text}`}>
                        {editForm.label || status.label}
                      </span>
                    ) : (
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${colorClasses.bg} ${colorClasses.text}`}>
                        {status.label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600 font-mono">
                    {status.code}
                  </td>
                  <td className="px-4 py-2">
                    {isEditing ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={editForm.label}
                          onChange={e => setEditForm({ ...editForm, label: e.target.value })}
                          className="w-32 px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                        <select
                          value={editForm.color}
                          onChange={e => setEditForm({ ...editForm, color: e.target.value })}
                          className="px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                          {COLOR_OPTIONS.map(option => (
                            <option key={option.value} value={option.value}>{option.label}</option>
                          ))}
                        </select>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-900">{status.label}</span>
                    )}
                  </td>
                  <td className="px-4 py-2">
                    {status.is_default ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-indigo-100 text-indigo-800">
                        기본값
                      </span>
                    ) : canEdit ? (
                      <button
                        onClick={() => handleSetDefault(status.id)}
                        disabled={saving}
                        className="text-xs text-gray-500 hover:text-indigo-600"
                      >
                        기본값으로 설정
                      </button>
                    ) : null}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-2 text-right">
                      {isEditing ? (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleUpdate(status.id)}
                            disabled={saving}
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded"
                          >
                            <CheckIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1.5 text-gray-400 hover:bg-gray-100 rounded"
                          >
                            <XMarkIcon className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => startEdit(status)}
                            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(status.id, status.label)}
                            disabled={saving}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {statuses.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          등록된 상태가 없습니다.
        </div>
      )}
    </div>
  )
}
