'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import CompanyHeader from './components/CompanyHeader'
import OverviewTab from './components/OverviewTab'
import UsersTab from './components/UsersTab'
import ActivityTab from './components/ActivityTab'
import FeaturesTab from './components/FeaturesTab'
import type { CompanyDetailResponse } from '@/types/admin'

type TabType = 'overview' | 'users' | 'features' | 'activities'

export default function CompanyDetailPage() {
  const params = useParams()
  const companyId = params.id as string

  const [data, setData] = useState<CompanyDetailResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabType>('overview')
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchCompany()
  }, [companyId])

  async function fetchCompany() {
    try {
      setLoading(true)
      const response = await fetch(`/admin/api/companies/${companyId}`)
      if (!response.ok) throw new Error('Failed to fetch company')

      const result = await response.json()
      setData(result)
      setError(null)
    } catch (err) {
      setError('회사 정보를 불러오는데 실패했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus() {
    if (!data) return

    try {
      setIsUpdating(true)
      const response = await fetch(`/admin/api/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !data.company.is_active }),
      })

      if (!response.ok) throw new Error('Failed to update company')

      // 데이터 새로고침
      await fetchCompany()
    } catch (err) {
      alert('회사 상태 변경에 실패했습니다')
      console.error(err)
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-sm text-gray-500 mt-4">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <p className="text-red-500">{error || '회사를 찾을 수 없습니다'}</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'overview' as TabType, label: '개요' },
    { id: 'users' as TabType, label: '사용자' },
    { id: 'features' as TabType, label: '기능 사용' },
    { id: 'activities' as TabType, label: '활동 로그' },
  ]

  return (
    <div>
      {/* 헤더 */}
      <CompanyHeader
        company={data.company}
        onToggleStatus={handleToggleStatus}
        isUpdating={isUpdating}
      />

      {/* 탭 네비게이션 */}
      <div className="bg-white border-b border-gray-200">
        <div className="px-8">
          <nav className="flex gap-8">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* 탭 컨텐츠 */}
      <div className="p-8">
        {activeTab === 'overview' && <OverviewTab company={data.company} />}
        {activeTab === 'users' && <UsersTab companyId={companyId} />}
        {activeTab === 'features' && <FeaturesTab companyId={companyId} />}
        {activeTab === 'activities' && <ActivityTab companyId={companyId} />}
      </div>
    </div>
  )
}
