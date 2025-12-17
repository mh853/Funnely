'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  Mail,
  Plus,
  Search,
  Filter,
  Edit,
  Copy,
  Trash2,
  Power,
  PowerOff,
  Loader2,
  Eye,
  BarChart3,
} from 'lucide-react'
import type { EmailTemplate, EmailCategory } from '@/types/email'
import { EMAIL_CATEGORIES } from '@/types/email'

interface TemplatesResponse {
  templates: EmailTemplate[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export default function EmailTemplatesPage() {
  const router = useRouter()

  const [data, setData] = useState<TemplatesResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchTemplates()
  }, [categoryFilter, statusFilter, searchTerm, page])

  async function fetchTemplates() {
    try {
      setLoading(true)

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })

      if (categoryFilter !== 'all') {
        params.append('category', categoryFilter)
      }

      if (statusFilter !== 'all') {
        params.append('is_active', statusFilter === 'active' ? 'true' : 'false')
      }

      if (searchTerm) {
        params.append('search', searchTerm)
      }

      const response = await fetch(`/api/admin/email-templates?${params}`)
      if (!response.ok) throw new Error('Failed to fetch templates')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching templates:', error)
      alert('템플릿 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus(templateId: string) {
    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}/toggle`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to toggle status')

      await fetchTemplates()
    } catch (error) {
      console.error('Error toggling status:', error)
      alert('상태 변경에 실패했습니다.')
    }
  }

  async function handleDuplicate(templateId: string) {
    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}/duplicate`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to duplicate template')

      const result = await response.json()
      router.push(`/admin/email-templates/${result.template.id}`)
    } catch (error) {
      console.error('Error duplicating template:', error)
      alert('템플릿 복제에 실패했습니다.')
    }
  }

  async function handleDelete(templateId: string, templateName: string) {
    if (!confirm(`"${templateName}" 템플릿을 삭제하시겠습니까?`)) {
      return
    }

    try {
      const response = await fetch(`/api/admin/email-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to delete template')

      await fetchTemplates()
    } catch (error) {
      console.error('Error deleting template:', error)
      alert('템플릿 삭제에 실패했습니다.')
    }
  }

  function getCategoryLabel(category?: EmailCategory) {
    if (!category) return '-'
    const cat = EMAIL_CATEGORIES.find((c) => c.value === category)
    return cat?.label || category
  }

  function getStatusBadge(isActive: boolean) {
    if (isActive) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
          <Power className="w-3 h-3" />
          활성
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded">
        <PowerOff className="w-3 h-3" />
        비활성
      </span>
    )
  }

  function getOpenRate(stats: EmailTemplate['stats']) {
    if (stats.sent === 0) return '-'
    const rate = (stats.opened / stats.sent) * 100
    return `${rate.toFixed(1)}%`
  }

  function getClickRate(stats: EmailTemplate['stats']) {
    if (stats.sent === 0) return '-'
    const rate = (stats.clicked / stats.sent) * 100
    return `${rate.toFixed(1)}%`
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Mail className="w-6 h-6 text-indigo-600" />
              <h1 className="text-xl font-semibold">이메일 템플릿</h1>
              {data && (
                <span className="text-sm text-gray-500">
                  ({data.total}개)
                </span>
              )}
            </div>

            <button
              onClick={() => router.push('/admin/email-templates/new')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              새 템플릿
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filters */}
        <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setPage(1)
                  }}
                  placeholder="템플릿 이름 또는 제목으로 검색..."
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <select
                  value={categoryFilter}
                  onChange={(e) => {
                    setCategoryFilter(e.target.value)
                    setPage(1)
                  }}
                  className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm appearance-none"
                >
                  <option value="all">모든 카테고리</option>
                  {EMAIL_CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="all">모든 상태</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
            </div>
          </div>
        </div>

        {/* Templates List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        ) : data && data.templates.length > 0 ? (
          <>
            <div className="space-y-4">
              {data.templates.map((template) => (
                <div
                  key={template.id}
                  className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium">{template.name}</h3>
                        {getStatusBadge(template.is_active)}
                        {template.category && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded">
                            {getCategoryLabel(template.category)}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-gray-600 mb-3">
                        제목: {template.subject}
                      </p>

                      <div className="flex items-center gap-6 text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <BarChart3 className="w-4 h-4" />
                          <span>발송: {template.stats.sent.toLocaleString()}건</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Eye className="w-4 h-4" />
                          <span>오픈율: {getOpenRate(template.stats)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span>클릭율: {getClickRate(template.stats)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => router.push(`/admin/email-templates/${template.id}`)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="편집"
                      >
                        <Edit className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleToggleStatus(template.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title={template.is_active ? '비활성화' : '활성화'}
                      >
                        {template.is_active ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </button>

                      <button
                        onClick={() => handleDuplicate(template.id)}
                        className="p-2 hover:bg-gray-100 rounded-lg"
                        title="복제"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => handleDelete(template.id, template.name)}
                        className="p-2 hover:bg-red-50 text-red-600 rounded-lg"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {data.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6">
                <div className="text-sm text-gray-500">
                  {data.total}개 중 {(page - 1) * data.limit + 1}-
                  {Math.min(page * data.limit, data.total)}개 표시
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    이전
                  </button>

                  <div className="flex items-center gap-1">
                    {Array.from({ length: data.totalPages }, (_, i) => i + 1).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        className={`px-3 py-2 rounded-lg text-sm font-medium ${
                          p === page
                            ? 'bg-indigo-600 text-white'
                            : 'border border-gray-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page === data.totalPages}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    다음
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12">
            <Mail className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              이메일 템플릿이 없습니다
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              첫 번째 이메일 템플릿을 만들어보세요.
            </p>
            <button
              onClick={() => router.push('/admin/email-templates/new')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium"
            >
              <Plus className="w-4 h-4" />
              새 템플릿
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
