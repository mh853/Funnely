'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { GlobeAltIcon, TrashIcon } from '@heroicons/react/24/outline'
import { getLandingPageUrl } from '@/lib/config'

interface LandingPageCardProps {
  page: any
}

export default function LandingPageCard({ page }: LandingPageCardProps) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true)
      return
    }

    setDeleting(true)

    try {
      const res = await fetch(`/api/landing-pages/${page.id}`, {
        method: 'DELETE',
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '삭제 실패')
      }

      router.refresh()
    } catch (error: any) {
      alert(error.message)
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <div className="relative block bg-white rounded-lg shadow hover:shadow-md transition-shadow overflow-hidden">
      <Link href={`/dashboard/landing-pages/${page.id}`} className="block">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-full ${
                page.status === 'published'
                  ? 'bg-green-100 text-green-800'
                  : page.status === 'draft'
                  ? 'bg-gray-100 text-gray-800'
                  : 'bg-red-100 text-red-800'
              }`}
            >
              {page.status === 'published'
                ? '게시됨'
                : page.status === 'draft'
                ? '초안'
                : '보관됨'}
            </span>
            <GlobeAltIcon className="h-5 w-5 text-gray-400" />
          </div>

          <h3 className="text-lg font-medium text-gray-900 mb-2">{page.title}</h3>

          {page.status === 'published' && (
            <p className="text-sm text-blue-600 mb-4 truncate">
              {getLandingPageUrl(page.slug).replace('https://', '')}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
            <div>
              <p className="text-xs text-gray-500">조회수</p>
              <p className="text-lg font-semibold text-gray-900">
                {page.views_count?.toLocaleString() || 0}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">신청수</p>
              <p className="text-lg font-semibold text-gray-900">
                {page.submissions_count?.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {page.submissions_count > 0 && page.views_count > 0 && (
            <div className="mt-2 pt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500">전환율</p>
              <p className="text-sm font-medium text-green-600">
                {((page.submissions_count / page.views_count) * 100).toFixed(2)}%
              </p>
            </div>
          )}
        </div>
      </Link>

      {/* Delete button */}
      <div className="absolute top-4 right-4">
        {!showDeleteConfirm ? (
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
            title="삭제"
          >
            <TrashIcon className="h-5 w-5" />
          </button>
        ) : (
          <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-2 py-1 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded disabled:opacity-50"
            >
              {deleting ? '삭제 중...' : '확인'}
            </button>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowDeleteConfirm(false)
              }}
              disabled={deleting}
              className="px-2 py-1 text-xs font-medium text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 rounded disabled:opacity-50"
            >
              취소
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
