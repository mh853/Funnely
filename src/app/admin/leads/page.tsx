'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Filter, Download, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import SimpleStatsCard from '../components/SimpleStatsCard'

interface Lead {
  id: string
  name: string
  phone: string
  email: string | null
  status: string
  priority: string
  created_at: string
  company: {
    id: string
    name: string
  }
  landing_page: {
    id: string
    title: string
  } | null
  utm_source: string | null
}

interface LeadsData {
  leads: Lead[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  summary: {
    total: number
    new: number
    contacted: number
    qualified: number
    converted: number
  }
}

const STATUS_LABELS: Record<string, string> = {
  new: '신규',
  contacted: '연락완료',
  qualified: '적격',
  converted: '전환완료',
  lost: '실패',
}

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-100 text-blue-700',
  contacted: 'bg-yellow-100 text-yellow-700',
  qualified: 'bg-purple-100 text-purple-700',
  converted: 'bg-green-100 text-green-700',
  lost: 'bg-gray-100 text-gray-700',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
}

export default function LeadsPage() {
  const [data, setData] = useState<LeadsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    fetchLeads()
  }, [page, search, statusFilter])

  async function fetchLeads() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
      })
      if (search) params.set('search', search)
      if (statusFilter) params.set('status', statusFilter)

      const response = await fetch(`/admin/api/leads?${params}`)
      if (!response.ok) throw new Error('Failed to fetch leads')

      const result = await response.json()
      setData(result)
    } catch (error) {
      console.error('Error fetching leads:', error)
    } finally {
      setLoading(false)
    }
  }

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPage(1)
    fetchLeads()
  }

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">데이터를 불러올 수 없습니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">리드 관리</h2>
          <p className="text-sm text-gray-500 mt-1">
            모든 회사의 리드를 조회하고 관리합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* 요약 통계 */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <SimpleStatsCard
          title="전체 리드"
          value={data.summary.total}
          subtitle="총 리드 수"
        />
        <SimpleStatsCard
          title="신규"
          value={data.summary.new}
          subtitle="새로운 리드"
          trendUp={true}
        />
        <SimpleStatsCard
          title="연락완료"
          value={data.summary.contacted}
          subtitle="연락 완료"
        />
        <SimpleStatsCard
          title="적격"
          value={data.summary.qualified}
          subtitle="적격 리드"
        />
        <SimpleStatsCard
          title="전환완료"
          value={data.summary.converted}
          subtitle="전환 성공"
          trendUp={true}
        />
      </div>

      {/* 필터 및 검색 */}
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSearchSubmit} className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                type="text"
                placeholder="이름 또는 이메일로 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="상태 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">전체 상태</SelectItem>
                <SelectItem value="new">신규</SelectItem>
                <SelectItem value="contacted">연락완료</SelectItem>
                <SelectItem value="qualified">적격</SelectItem>
                <SelectItem value="converted">전환완료</SelectItem>
                <SelectItem value="lost">실패</SelectItem>
              </SelectContent>
            </Select>
            <Button type="submit">
              <Filter className="h-4 w-4 mr-2" />
              필터
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 리드 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>
            리드 목록 ({data.pagination.total.toLocaleString()}개)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    이름
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    연락처
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    회사
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    랜딩페이지
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    상태
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    우선순위
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    생성일
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    작업
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.leads.map((lead) => (
                  <tr
                    key={lead.id}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {lead.name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <div>{lead.phone}</div>
                      {lead.email && (
                        <div className="text-xs text-gray-500">{lead.email}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      <Link
                        href={`/admin/companies/${lead.company.id}`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        {lead.company.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {lead.landing_page?.title || '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          STATUS_COLORS[lead.status] || 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {STATUS_LABELS[lead.status] || lead.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {PRIORITY_LABELS[lead.priority] || lead.priority}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(lead.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/leads/${lead.id}`}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {data.leads.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                리드가 없습니다
              </div>
            )}
          </div>

          {/* 페이지네이션 */}
          {data.pagination.totalPages > 1 && (
            <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
              <div className="text-sm text-gray-600">
                전체 {data.pagination.total.toLocaleString()}개 중{' '}
                {((page - 1) * 20 + 1).toLocaleString()}-
                {Math.min(page * 20, data.pagination.total).toLocaleString()}개
                표시
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={!data.pagination.hasPrev}
                >
                  이전
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={!data.pagination.hasNext}
                >
                  다음
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
