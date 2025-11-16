'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LandingPage } from '@/types/landing-page.types'

interface LandingPageEditorProps {
  landingPage: LandingPage
  hospitalId: string
  userId: string
}

export default function LandingPageEditor({
  landingPage,
  hospitalId,
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
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">페이지 디자인</h3>
              <p className="text-sm text-gray-500 mb-4">
                드래그 앤 드롭으로 섹션을 추가하고 편집하세요.
              </p>

              {/* Theme Colors */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    주요 색상
                  </label>
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
                    className="mt-1 block w-20 h-10 rounded-md border-gray-300 shadow-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    보조 색상
                  </label>
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
                    className="mt-1 block w-20 h-10 rounded-md border-gray-300 shadow-sm"
                  />
                </div>
              </div>

              {/* Placeholder for drag-and-drop editor */}
              <div className="mt-6 border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                <p className="text-gray-500">
                  섹션 에디터 구현 예정
                  <br />
                  <span className="text-xs">
                    (히어로, 기능, 후기, CTA, 폼 등의 섹션을 추가할 수 있습니다)
                  </span>
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6">
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
              <label className="block text-sm font-medium text-gray-700">URL</label>
              <div className="mt-1 flex rounded-md shadow-sm">
                <span className="inline-flex items-center rounded-l-md border border-r-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                  https://
                </span>
                <input
                  type="text"
                  value={landingPage.slug}
                  disabled
                  className="block w-full rounded-none border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                />
                <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
                  .medisync.kr
                </span>
              </div>
              <p className="mt-1 text-xs text-gray-500">URL은 생성 후 변경할 수 없습니다.</p>
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
          <div className="space-y-6">
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
      <div className="bg-gray-50 px-6 py-4 flex justify-between rounded-b-lg">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
        >
          취소
        </button>
        <div className="flex space-x-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '저장 중...' : '저장'}
          </button>
          {formData.status !== 'published' && (
            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '발행 중...' : '발행'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
