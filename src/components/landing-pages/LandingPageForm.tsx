'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LandingPageFormProps {
  hospitalId: string
  userId: string
  initialData?: any
}

export default function LandingPageForm({
  hospitalId,
  userId,
  initialData,
}: LandingPageFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    meta_title: initialData?.meta_title || '',
    meta_description: initialData?.meta_description || '',
    template_id: initialData?.template_id || 'basic',
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/landing-pages', {
        method: initialData ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          hospital_id: hospitalId,
          created_by: userId,
          id: initialData?.id,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || '랜딩 페이지 생성 실패')
      }

      const data = await res.json()
      router.push(`/dashboard/landing-pages/${data.data.id}`)
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  const generateSlug = () => {
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '')
    setFormData({ ...formData, slug })
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow rounded-lg">
      <div className="p-6 space-y-6">
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
            페이지 제목 *
          </label>
          <input
            type="text"
            id="title"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            onBlur={generateSlug}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="예: 무료 건강검진 신청"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700">
            URL 슬러그 *
          </label>
          <div className="mt-1 flex rounded-md shadow-sm">
            <input
              type="text"
              id="slug"
              required
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="block w-full rounded-l-md border-gray-300 focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="health-check"
              pattern="[a-z0-9-]+"
            />
            <span className="inline-flex items-center rounded-r-md border border-l-0 border-gray-300 bg-gray-50 px-3 text-gray-500 sm:text-sm">
              .medisync.kr
            </span>
          </div>
          <p className="mt-1 text-xs text-gray-500">
            영문 소문자, 숫자, 하이픈(-)만 사용 가능
          </p>
        </div>

        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700">
            템플릿 선택
          </label>
          <select
            id="template"
            value={formData.template_id}
            onChange={(e) => setFormData({ ...formData, template_id: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
          >
            <option value="basic">기본 템플릿</option>
            <option value="medical">의료 전문</option>
            <option value="modern">모던 디자인</option>
          </select>
        </div>

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
        </div>

        <div>
          <label htmlFor="meta_description" className="block text-sm font-medium text-gray-700">
            SEO 설명
          </label>
          <textarea
            id="meta_description"
            rows={3}
            value={formData.meta_description}
            onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="검색엔진에 표시될 설명"
          />
        </div>
      </div>

      <div className="bg-gray-50 px-6 py-4 flex justify-between rounded-b-lg">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '생성 중...' : initialData ? '수정' : '생성'}
        </button>
      </div>
    </form>
  )
}
