'use client'

import React, { useState } from 'react'
import { PlusIcon, TrashIcon, ShieldExclamationIcon } from '@heroicons/react/24/outline'
import { formatDateTime } from '@/lib/utils/date'
import AddBlacklistModal from '@/components/modals/AddBlacklistModal'

interface BlacklistEntry {
  id: string
  phone_number: string
  reason: string | null
  blocked_at: string
  blocked_by: {
    full_name: string
  } | null
}

interface BlacklistClientProps {
  blacklist: BlacklistEntry[]
  userProfile: any
}

export default function BlacklistClient({ blacklist: initialBlacklist, userProfile }: BlacklistClientProps) {
  const [blacklist, setBlacklist] = useState(initialBlacklist)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  const handleDelete = async (id: string) => {
    if (!confirm('이 번호를 블랙리스트에서 제거하시겠습니까?')) {
      return
    }

    setIsDeleting(id)

    try {
      const response = await fetch(`/api/dashboard/blacklist/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Failed to delete blacklist entry')
      }

      // UI에서 제거
      setBlacklist((prev) => prev.filter((entry) => entry.id !== id))
    } catch (error) {
      console.error('Error deleting blacklist entry:', error)
      alert('블랙리스트 삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleAdd = (newEntry: BlacklistEntry) => {
    setBlacklist((prev) => [newEntry, ...prev])
  }

  return (
    <div className="px-4">
      {/* Header - 다른 페이지와 동일한 디자인 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-red-500 to-orange-600 rounded-xl shadow-lg">
            <ShieldExclamationIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">DB 블랙리스트</h1>
            <p className="text-xs text-gray-500 mt-0.5">추가한 번호에 대해서는 DB 현황에 입력되지 않습니다</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-red-500 to-orange-600 text-white rounded-xl text-sm font-semibold hover:from-red-600 hover:to-orange-700 transition-all shadow-lg hover:shadow-xl gap-2"
          >
            <PlusIcon className="h-4 w-4" />
            추가하기
          </button>
        </div>
      </div>

      {/* 테이블 */}
      <div className="mt-8 flow-root">
        <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
          <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
            <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 sm:rounded-lg">
              <table className="min-w-full divide-y divide-gray-300">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      scope="col"
                      className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6"
                    >
                      NO.
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      등록 날짜
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      전화번호
                    </th>
                    <th
                      scope="col"
                      className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                    >
                      비고
                    </th>
                    <th
                      scope="col"
                      className="relative py-3.5 pl-3 pr-4 sm:pr-6"
                    >
                      <span className="sr-only">삭제</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 bg-white">
                  {blacklist.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-3 py-8 text-center text-sm text-gray-500"
                      >
                        블랙리스트에 등록된 번호가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    blacklist.map((entry, index) => (
                      <tr key={entry.id}>
                        <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                          {blacklist.length - index}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                          {formatDateTime(entry.blocked_at)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-4 text-sm font-medium text-gray-900">
                          {entry.phone_number}
                        </td>
                        <td className="px-3 py-4 text-sm text-gray-500">
                          {entry.reason || '텍스트 필드'}
                        </td>
                        <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                          <button
                            onClick={() => handleDelete(entry.id)}
                            disabled={isDeleting === entry.id}
                            className="inline-flex items-center gap-x-1.5 rounded-md bg-white px-2.5 py-1.5 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 hover:bg-gray-50 disabled:opacity-50"
                          >
                            {isDeleting === entry.id ? (
                              '삭제 중...'
                            ) : (
                              <>
                                <TrashIcon className="h-4 w-4 text-gray-500" />
                                삭제
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 추가 모달 */}
      <AddBlacklistModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAdd}
        userId={userProfile.id}
      />
    </div>
  )
}
