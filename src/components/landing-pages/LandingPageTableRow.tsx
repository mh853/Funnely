'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PencilIcon, TrashIcon } from '@heroicons/react/24/outline'
import DeleteLandingPageModal from './DeleteLandingPageModal'
import { formatDate } from '@/lib/utils/date'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { generateLandingPageURL } from '@/lib/utils/landing-page-url'
import { useToast } from '@/components/shared/Toast'

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
    timer_enabled?: boolean
    timer_deadline?: string | null
    timer_auto_update?: boolean
  }
  index: number
  companyShortId?: string | null
}

// 에디터(LandingPageNewForm.tsx)의 게시 토글은 타이머가 만료됐으면 켜는 것을
// 막는데, 목록 화면의 빠른토글은 이 가드가 없어 타이머 만료로 자동 비활성화된
// 페이지를 다시 켜도 곧바로(timer-expired API 재검증으로) 도로 꺼지고 알림만
// 쌓였다(87차 QA). 동일한 가드를 적용한다.
function isTimerExpired(deadline: string | null | undefined, autoUpdate = false): boolean {
  if (!deadline) return false
  if (autoUpdate) return false
  return Date.now() > new Date(deadline).getTime()
}

export default function LandingPageTableRow({ page, index, companyShortId }: LandingPageTableRowProps) {
  const toast = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isActive, setIsActive] = useState(page.is_active)
  const [isUpdating, setIsUpdating] = useState(false)

  // Sync local state when parent updates is_active (e.g. Realtime timer expiry)
  useEffect(() => {
    setIsActive(page.is_active)
  }, [page.is_active])
  const [landingPageUrl, setLandingPageUrl] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const formattedDate = formatDate(page.created_at)

  // Generate URL on client-side to detect correct port
  useEffect(() => {
    const url = companyShortId
      ? generateLandingPageURL(companyShortId, page.slug)
      : `https://funnely.co.kr/landing/${page.slug}`
    setLandingPageUrl(url)
  }, [companyShortId, page.slug])

  const handleToggleStatus = async () => {
    if (isUpdating) return

    const newStatus = !isActive

    if (newStatus && page.timer_enabled && page.timer_deadline && isTimerExpired(page.timer_deadline, page.timer_auto_update)) {
      toast.error('타이머가 마감되었습니다. 먼저 타이머 설정을 변경해주세요.')
      return
    }

    setIsUpdating(true)

    try {
      // count: 'exact'는 UPDATE 체인에서 이 프로젝트 환경상 항상 null로 돌아와(84차 QA
      // 실DB 확인) "권한없음/대상없음" 검증이 사실상 통과되고 있었다(85차 count 전수조사로
      // 재확인 - 이 화면은 하필 RLS의 landing_pages UPDATE 정책에 company_admin 역할이
      // 빠져있어(별도 이슈로 백로그 기록) 매일 실사용되는 게시/중지 토글이 조용히
      // 안 먹히다가 router.refresh() 후 원상태로 되돌아가는 증상으로 이어졌다).
      // 실제로 갱신된 행(data)의 존재여부로 판단한다.
      const { error, data: updatedRows } = await (supabase as any)
        .from('landing_pages')
        .update({
          is_active: newStatus,
          status: newStatus ? 'published' : 'draft',
        })
        .eq('id', page.id)
        .select('id')

      if (error) throw error
      if (!updatedRows || updatedRows.length === 0) throw new Error('권한이 없거나 대상을 찾을 수 없습니다.')

      setIsActive(newStatus)

      // Revalidate landing page cache so changes reflect immediately
      try {
        await fetch('/api/revalidate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ slug: page.slug }),
        })
      } catch {
        // Non-critical: cache will expire naturally
      }

      router.refresh()
    } catch (error) {
      console.error('Failed to update status:', error)
      toast.error('상태 업데이트에 실패했습니다.')
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
