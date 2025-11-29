'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LandingPage } from '@/types/landing-page.types'
import VisualEditor from './editor/VisualEditor'
import { getLandingPageUrl } from '@/lib/config'

interface LandingPageEditorProps {
  landingPage: LandingPage
  companyId: string
  userId: string
}

export default function LandingPageEditor({
  landingPage,
  companyId,
  userId,
}: LandingPageEditorProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'design' | 'settings' | 'seo'>('design')

  const [formData, setFormData] = useState({
    title: landingPage.title,
    meta_title: landingPage.meta_title || '',
    meta_description: landingPage.meta_description || '',
    sections: landingPage.sections || [],
    theme: landingPage.theme || {
      colors: { primary: '#3B82F6', secondary: '#10B981' },
      fonts: { heading: 'Inter', body: 'Inter' },
    },
    status: landingPage.status,
  })

  const handleSave = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/landing-pages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: landingPage.id,
          ...formData,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '저장 실패')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePublish = async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/landing-pages', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: landingPage.id,
          ...formData,
          status: 'published',
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '발행 실패')
      }

      router.refresh()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white shadow rounded-lg">
      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
          <button
            onClick={() => setActiveTab('design')}
            className={`${
              activeTab === 'design'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            디자인
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`${
              activeTab === 'settings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            설정
          </button>
          <button
            onClick={() => setActiveTab('seo')}
            className={`${
              activeTab === 'seo'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
          >
            SEO
          </button>
        </nav>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {activeTab === 'design' && (
          <div className="h-[calc(100vh-300px)]">
            {/* Theme Colors - Compact */}
            <div className="flex items-center gap-6 p-4 bg-gray-50 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900">테마 색상:</h3>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-700">주요</label>
                <input
                  type="color"
                  value={formData.theme.colors.primary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      theme: {
                        ...formData.theme,
                        colors: { ...formData.theme.colors, primary: e.target.value },
                      },
                    })
                  }
                  className="w-10 h-8 rounded border-gray-300"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-gray-700">보조</label>
                <input
                  type="color"
                  value={formData.theme.colors.secondary}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      theme: {
                        ...formData.theme,
                        colors: { ...formData.theme.colors, secondary: e.target.value },
                      },
                    })
                  }
                  className="w-10 h-8 rounded border-gray-300"
                />
              </div>
            </div>

            {/* Visual Editor - Full Height */}
            <VisualEditor
              sections={formData.sections}
              onChange={(sections) => setFormData({ ...formData, sections })}
              themeColors={formData.theme.colors}
            />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 pb-20">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                페이지 제목
              </label>
              <input
                type="text"
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">공개 URL</label>
              <div className="mt-1">
                <input
                  type="text"
                  value={getLandingPageUrl(landingPage.slug)}
                  disabled
                  className="block w-full rounded-md border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                공개 URL은 생성 후 변경할 수 없습니다. 도메인은 환경 설정에서 변경 가능합니다.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">상태</label>
              <select
                value={formData.status}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    status: e.target.value as 'draft' | 'published' | 'archived',
                  })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              >
                <option value="draft">초안</option>
                <option value="published">게시됨</option>
                <option value="archived">보관됨</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'seo' && (
          <div className="space-y-6 pb-20">
            <div>
              <label htmlFor="meta_title" className="block text-sm font-medium text-gray-700">
                SEO 제목
              </label>
              <input
                type="text"
                id="meta_title"
                value={formData.meta_title}
                onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="검색엔진에 표시될 제목"
              />
              <p className="mt-1 text-xs text-gray-500">권장 길이: 50-60자</p>
            </div>

            <div>
              <label
                htmlFor="meta_description"
                className="block text-sm font-medium text-gray-700"
              >
                SEO 설명
              </label>
              <textarea
                id="meta_description"
                rows={3}
                value={formData.meta_description}
                onChange={(e) =>
                  setFormData({ ...formData, meta_description: e.target.value })
                }
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                placeholder="검색엔진에 표시될 설명"
              />
              <p className="mt-1 text-xs text-gray-500">권장 길이: 150-160자</p>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="bg-white border-t border-gray-200 px-6 py-4 flex items-center justify-between gap-4 rounded-b-lg sticky bottom-0">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
          {formData.status !== 'published' && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow transition-all"
            >
              {loading ? '발행 중...' : '발행'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
