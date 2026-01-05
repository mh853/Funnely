'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import DeleteLandingPageModal from './DeleteLandingPageModal'
import { formatDate } from '@/lib/utils/date'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { generateLandingPageURL } from '@/lib/utils/landing-page-url'

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
  companyShortId?: string | null
}

export default function LandingPageTableRow({ page, index, companyShortId }: LandingPageTableRowProps) {
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isActive, setIsActive] = useState(page.is_active)
  const [isUpdating, setIsUpdating] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const formattedDate = formatDate(page.created_at)
  const landingPageUrl = companyShortId
    ? generateLandingPageURL(companyShortId, page.slug)
    : `https://funnely.co.kr/landing/${page.slug}`

  const handleToggleStatus = async () => {
    if (isUpdating) return

    setIsUpdating(true)
    const newStatus = !isActive

    try {
      const { error } = await supabase
        .from('landing_pages')
        .update({ is_active: newStatus })
        .eq('id', page.id)

      if (error) throw error

      setIsActive(newStatus)
      router.refresh()
    } catch (error) {
      console.error('Failed to update status:', error)
      alert('상태 업데이트에 실패했습니다.')
    } finally {
      setIsUpdating(false)
    }
  }

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
        <td className="px-4 py-2.5 max-w-xs">
          <div className="flex items-center">
            <div className="min-w-0 flex-1">
              <a
                href={landingPageUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-indigo-600 hover:text-indigo-800 hover:underline transition-colors block truncate"
                title={page.title}
              >
                {page.title}
              </a>
              <div className="text-xs text-gray-500 mt-0.5 truncate" title={`/${page.slug}`}>/{page.slug}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-center">
          <button
            onClick={handleToggleStatus}
            disabled={isUpdating}
            className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
              isActive ? 'bg-green-500' : 'bg-gray-300'
            }`}
            role="switch"
            aria-checked={isActive}
          >
            <span
              className={`inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform ${
                isActive ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
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
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-semibold text-gray-900">
              {page.rejectedCount.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-red-600">
              ({page.dbInflow > 0 ? `${((page.rejectedCount / page.dbInflow) * 100).toFixed(0)}%` : '0%'})
            </span>
          </div>
        </td>
        <td className="px-4 py-2.5 whitespace-nowrap text-center">
          <div className="flex flex-col items-center gap-0.5">
            <span className="text-sm font-semibold text-gray-900">
              {page.contractCount.toLocaleString()}
            </span>
            <span className="text-xs font-medium text-green-600">
              ({page.dbInflow > 0 ? `${((page.contractCount / page.dbInflow) * 100).toFixed(0)}%` : '0%'})
            </span>
          </div>
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
