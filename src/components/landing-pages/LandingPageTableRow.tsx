'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import DeleteLandingPageModal from './DeleteLandingPageModal'
import { formatDate } from '@/lib/utils/date'

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

  const formattedDate = formatDate(page.created_at)

  return (
    <>
      <tr
        className={`transition-colors hover:bg-indigo-50 ${
          index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
        }`}
      >
        <td className="px-4 py-2.5 whitespace-nowrap text-sm font-medium text-gray-900">
          {formattedDate}
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap">
          <div className="flex items-center">
            <div>
              <a
                href={`https://funnely.co.kr/landing/${page.slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors"
              >
                {page.title}
              </a>
              <div className="text-xs text-gray-500 mt-0.5">/{page.slug}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-center">
          {page.is_active ? (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-800 gap-1">
              <span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span>
              배포중
            </span>
          ) : (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600 gap-1">
              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
              비활성
            </span>
          )}
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-center">
          <span className="text-sm font-semibold text-gray-900">
            {page.pageViews.toLocaleString()}
          </span>
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
            {page.dbInflow.toLocaleString()}
          </span>
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-red-100 text-red-800">
            {page.rejectedCount.toLocaleString()}
          </span>
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-center">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-semibold bg-emerald-100 text-emerald-800">
            {page.contractCount.toLocaleString()}
          </span>
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-center">
          <div className="flex items-center justify-center gap-1.5">
            <Link
              href={`/dashboard/landing-pages/${page.id}/edit`}
              className="inline-flex items-center px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-lg text-sm font-medium hover:from-indigo-600 hover:to-purple-700 transition-all shadow-sm gap-1.5"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              수정
            </Link>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="inline-flex items-center px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 transition-all border border-red-200 gap-1.5"
              title="삭제"
            >
              <TrashIcon className="h-3.5 w-3.5" />
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
