'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import DeleteLandingPageModal from './DeleteLandingPageModal'

interface LandingPageTableRowProps {
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
  index: number
}

export default function LandingPageTableRow({ page, index }: LandingPageTableRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const createdDate = new Date(page.created_at)
  const formattedDate = createdDate.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })

  return (
    <>
      <tr
        className={`transition-colors hover:bg-indigo-50 ${
          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        }`}
      >
        <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-gray-900">
          {formattedDate}
        </td>
        <td className="px-6 py-5 whitespace-nowrap">
          <div className="flex items-center">
            <div>
              <Link
                href={`/dashboard/landing-pages/${page.id}`}
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
              >
                {page.title}
              </Link>
              <div className="text-xs text-gray-500 mt-1">/{page.slug}</div>
            </div>
          </div>
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-center">
          {page.is_active ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full"></span>
              배포중
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 gap-1">
              <span className="w-2 h-2 bg-gray-400 rounded-full"></span>
              비활성
            </span>
          )}
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-center">
          <span className="text-sm font-semibold text-gray-900">
            {page.pageViews.toLocaleString()}
          </span>
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
            {page.dbInflow.toLocaleString()}
          </span>
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
            {page.rejectedCount.toLocaleString()}
          </span>
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-center">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
            {page.contractCount.toLocaleString()}
          </span>
        </td>
        <td className="px-6 py-5 whitespace-nowrap text-center">
          <div className="flex items-center justify-center gap-2">
            <Link
              href={`/dashboard/landing-pages/${page.id}/edit`}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm gap-2"
            >
              <PencilIcon className="h-4 w-4" />
              수정
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-4 py-2 bg-red-50 text-red-600 rounded-lg font-medium hover:bg-red-100 transition-all border border-red-200 gap-2"
              title="삭제"
            >
              <TrashIcon className="h-4 w-4" />
              삭제
            </button>
          </div>
        </td>
      </tr>

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
