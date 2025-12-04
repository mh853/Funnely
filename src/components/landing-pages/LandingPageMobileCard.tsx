'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon, EyeIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline'
import DeleteLandingPageModal from './DeleteLandingPageModal'

interface LandingPageMobileCardProps {
  page: {
    id: string
    title: string
    slug: string
    is_active: boolean
    created_at: string
    pageViews: number
    dbInflow: number
    rejectedCount: number
    contractCount: number
  }
}

export default function LandingPageMobileCard({ page }: LandingPageMobileCardProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const createdDate = new Date(page.created_at)
  const formattedDate = createdDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <>
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* 헤더 영역 */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <Link
                href={`/dashboard/landing-pages/${page.id}`}
                className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors truncate block"
              >
                {page.title}
              </Link>
              <p className="text-xs text-gray-500 mt-0.5">/{page.slug}</p>
              <p className="text-xs text-gray-400 mt-1">{formattedDate}</p>
            </div>
            <div className="flex-shrink-0">
              {page.is_active ? (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 gap-1">
                  <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
                  배포중
                </span>
              ) : (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 gap-1">
                  <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                  비활성
                </span>
              )}
            </div>
          </div>

          {/* 주요 통계 */}
          <div className="grid grid-cols-4 gap-2 mt-4">
            <div className="text-center p-2 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">뷰</p>
              <p className="font-semibold text-gray-900 text-sm">{page.pageViews.toLocaleString()}</p>
            </div>
            <div className="text-center p-2 bg-blue-50 rounded-lg">
              <p className="text-xs text-blue-600">유입</p>
              <p className="font-semibold text-blue-800 text-sm">{page.dbInflow.toLocaleString()}</p>
            </div>
            <div className="text-center p-2 bg-red-50 rounded-lg">
              <p className="text-xs text-red-600">거절</p>
              <p className="font-semibold text-red-800 text-sm">{page.rejectedCount.toLocaleString()}</p>
            </div>
            <div className="text-center p-2 bg-emerald-50 rounded-lg">
              <p className="text-xs text-emerald-600">계약</p>
              <p className="font-semibold text-emerald-800 text-sm">{page.contractCount.toLocaleString()}</p>
            </div>
          </div>

          {/* 확장/축소 버튼 */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full mt-3 py-2 flex items-center justify-center gap-1 text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            {isExpanded ? (
              <>
                <ChevronUpIcon className="h-4 w-4" />
                접기
              </>
            ) : (
              <>
                <ChevronDownIcon className="h-4 w-4" />
                작업 메뉴
              </>
            )}
          </button>
        </div>

        {/* 확장 영역 - 작업 버튼 */}
        {isExpanded && (
          <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50">
            <div className="flex gap-2">
              <Link
                href={`/dashboard/landing-pages/${page.id}/edit`}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm gap-2 text-sm"
              >
                <PencilIcon className="h-4 w-4" />
                수정
              </Link>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="flex-1 inline-flex items-center justify-center px-4 py-2.5 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-all border border-red-200 gap-2 text-sm"
              >
                <TrashIcon className="h-4 w-4" />
                삭제
              </button>
            </div>
          </div>
        )}
      </div>

      <DeleteLandingPageModal
        landingPage={{
          id: page.id,
          title: page.title,
          slug: page.slug,
        }}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
      />
    </>
  )
}
