'use client'

import { useState, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { PlusIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline'
import { GlobeAltIcon } from '@heroicons/react/24/solid'
import LandingPageTableRow from '@/components/landing-pages/LandingPageTableRow'
import LandingPageMobileCard from '@/components/landing-pages/LandingPageMobileCard'
import { createClient } from '@/lib/supabase/client'

interface LandingPage {
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

interface LandingPagesClientProps {
  landingPages: LandingPage[]
  companyShortId?: string | null
}

export default function LandingPagesClient({
  landingPages: initialLandingPages,
  companyShortId,
}: LandingPagesClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [landingPages, setLandingPages] = useState(initialLandingPages)

  // Schedule precise timers for pages that will expire while the dashboard is open
  useEffect(() => {
    const now = Date.now()
    const timers: ReturnType<typeof setTimeout>[] = []

    const callExpiredApi = (pageId: string) => {
      fetch('/api/landing-pages/timer-expired', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ landing_page_id: pageId }),
      }).catch(() => {
        // Non-critical: cron job will catch it on next run
      })
    }

    for (const page of initialLandingPages) {
      if (!page.is_active || !page.timer_enabled || page.timer_auto_update || !page.timer_deadline) continue

      const deadline = new Date(page.timer_deadline).getTime()
      const msUntilExpiry = deadline - now

      if (msUntilExpiry <= 0) {
        // Already expired — call immediately
        callExpiredApi(page.id)
      } else {
        // Schedule to fire exactly when the timer runs out
        timers.push(setTimeout(() => callExpiredApi(page.id), msUntilExpiry))
      }
    }

    return () => timers.forEach(clearTimeout)
  }, [initialLandingPages])

  // Realtime: reflect is_active changes immediately (e.g. timer expiry)
  // Note: Supabase Realtime only supports eq/neq/lt/lte/gt/gte filters for postgres_changes,
  // so we subscribe to the whole table and filter by page ID in the handler
  useEffect(() => {
    const supabase = createClient()
    const pageIds = new Set(initialLandingPages.map(p => p.id))
    if (pageIds.size === 0) return

    const channel = supabase
      .channel('landing-pages-status')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'landing_pages',
        },
        (payload) => {
          const updated = payload.new as { id: string; is_active: boolean }
          if (!pageIds.has(updated.id)) return
          setLandingPages(prev =>
            prev.map(p => p.id === updated.id ? { ...p, is_active: updated.is_active } : p)
          )
        }
      )
      .subscribe((status) => {
        console.log('[LandingPages Realtime] subscription status:', status)
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [initialLandingPages])

  // 실시간 필터링
  const filteredPages = useMemo(() => {
    if (!searchQuery.trim()) {
      return landingPages
    }

    const query = searchQuery.toLowerCase().trim()
    return landingPages.filter(page =>
      page.title.toLowerCase().includes(query) ||
      page.slug.toLowerCase().includes(query)
    )
  }, [landingPages, searchQuery])

  return (
    <div className="px-4 space-y-6">
      {/* 헤더 */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg">
            <GlobeAltIcon className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900">랜딩 페이지</h1>
            <p className="text-xs text-gray-500 mt-0.5">전체 랜딩 페이지 관리</p>
          </div>
        </div>

        <Link
          href="/dashboard/landing-pages/new"
          className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl text-sm font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl gap-2"
        >
          <PlusIcon className="h-4 w-4" />
          새 페이지 만들기
        </Link>
      </div>

      {/* 검색 바 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="랜딩페이지 제목 또는 slug로 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
          />
        </div>

        {/* 검색 결과 카운트 */}
        <div className="mt-3 text-sm text-gray-600">
          {searchQuery.trim() ? (
            <span>
              <span className="font-semibold text-indigo-600">{filteredPages.length}개</span>의 랜딩페이지가 검색되었습니다
            </span>
          ) : (
            <span>
              총 <span className="font-semibold text-gray-900">{landingPages.length}개</span>의 랜딩페이지
            </span>
          )}
        </div>
      </div>

      {/* 데이터 표시 */}
      {filteredPages.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <GlobeAltIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold text-gray-900">
            {searchQuery.trim() ? '검색 결과가 없습니다' : '랜딩 페이지가 없습니다'}
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            {searchQuery.trim()
              ? '다른 검색어로 시도해보세요'
              : '새로운 랜딩 페이지를 만들어보세요'}
          </p>
        </div>
      ) : (
        <>
          {/* 데스크톱 테이블 */}
          <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gradient-to-r from-indigo-500 to-purple-600">
                  <tr>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">
                      생성일
                    </th>
                    <th className="px-4 py-3.5 text-left text-xs font-bold text-white uppercase tracking-wider">
                      제목
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider">
                      상태
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider">
                      페이지뷰
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider">
                      DB 유입
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider">
                      거절
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider">
                      확정
                    </th>
                    <th className="px-4 py-3.5 text-center text-xs font-bold text-white uppercase tracking-wider">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredPages.map((page, index) => (
                    <LandingPageTableRow
                      key={page.id}
                      page={page}
                      index={index}
                      companyShortId={companyShortId}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 모바일 카드 */}
          <div className="lg:hidden space-y-4">
            {filteredPages.map((page) => (
              <LandingPageMobileCard
                key={page.id}
                page={page}
                companyShortId={companyShortId}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
