'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Building2, Globe, Calendar, Tag, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

interface LeadDetail {
  id: string
  name: string
  phone: string
  email: string | null
  status: string
  priority: string
  consultation_items: string[] | null
  preferred_date: string | null
  preferred_time: string | null
  message: string | null
  tags: string[]
  created_at: string
  updated_at: string
  first_contact_at: string | null
  last_contact_at: string | null
  completed_at: string | null
  company: {
    id: string
    name: string
    slug: string
  }
  landing_page: {
    id: string
    title: string
    slug: string
  } | null
  assigned_to: {
    id: string
    full_name: string
    email: string
  } | null
  utm: {
    source: string | null
    medium: string | null
    campaign: string | null
    content: string | null
    term: string | null
  }
  referrer: string | null
  ip_address: string | null
  user_agent: string | null
}

interface StatusLog {
  id: string
  from_status: string
  to_status: string
  note: string | null
  created_at: string
  changed_by: {
    id: string
    full_name: string
  }
}

interface Note {
  id: string
  content: string
  created_at: string
  author: {
    id: string
    full_name: string
  }
}

const STATUS_LABELS: Record<string, string> = {
  new: '신규',
  contacted: '연락완료',
  qualified: '적격',
  converted: '전환완료',
  lost: '실패',
}

const PRIORITY_LABELS: Record<string, string> = {
  low: '낮음',
  medium: '보통',
  high: '높음',
  urgent: '긴급',
}

export default function LeadDetailPage() {
  const params = useParams()
  const router = useRouter()
  const leadId = params.id as string

  const [lead, setLead] = useState<LeadDetail | null>(null)
  const [statusLogs, setStatusLogs] = useState<StatusLog[]>([])
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchLeadDetail()
  }, [leadId])

  async function fetchLeadDetail() {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/leads/${leadId}`)
      if (!response.ok) throw new Error('Failed to fetch lead')

      const data = await response.json()
      setLead(data.lead)
      setStatusLogs(data.statusLogs)
      setNotes(data.notes)
    } catch (error) {
      console.error('Error fetching lead:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (!lead) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">리드를 찾을 수 없습니다</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push('/admin/leads')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          목록으로
        </Button>
        <div className="flex-1">
          <h2 className="text-2xl font-bold text-gray-900">{lead.name}</h2>
          <p className="text-sm text-gray-500 mt-1">
            리드 ID: {lead.id}
          </p>
        </div>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList>
          <TabsTrigger value="info">기본 정보</TabsTrigger>
          <TabsTrigger value="source">유입 경로</TabsTrigger>
          <TabsTrigger value="history">상태 이력</TabsTrigger>
          <TabsTrigger value="notes">메모</TabsTrigger>
        </TabsList>

        {/* 기본 정보 탭 */}
        <TabsContent value="info" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 연락처 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>연락처 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">이름</label>
                  <p className="text-sm text-gray-900 mt-1">{lead.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">전화번호</label>
                  <p className="text-sm text-gray-900 mt-1">{lead.phone}</p>
                </div>
                {lead.email && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">이메일</label>
                    <p className="text-sm text-gray-900 mt-1">{lead.email}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 리드 상태 */}
            <Card>
              <CardHeader>
                <CardTitle>리드 상태</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">현재 상태</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {STATUS_LABELS[lead.status] || lead.status}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">우선순위</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {PRIORITY_LABELS[lead.priority] || lead.priority}
                  </p>
                </div>
                {lead.assigned_to && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">담당자</label>
                    <p className="text-sm text-gray-900 mt-1">
                      {lead.assigned_to.full_name}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 회사 및 페이지 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>회사 및 페이지</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    회사
                  </label>
                  <Link
                    href={`/admin/companies/${lead.company.id}`}
                    className="text-sm text-blue-600 hover:text-blue-700 mt-1 block"
                  >
                    {lead.company.name}
                  </Link>
                </div>
                {lead.landing_page && (
                  <div>
                    <label className="text-sm font-medium text-gray-500 flex items-center gap-2">
                      <Globe className="h-4 w-4" />
                      랜딩페이지
                    </label>
                    <p className="text-sm text-gray-900 mt-1">
                      {lead.landing_page.title}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 상담 정보 */}
            <Card>
              <CardHeader>
                <CardTitle>상담 정보</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.consultation_items && lead.consultation_items.length > 0 && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">상담 항목</label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {lead.consultation_items.map((item, index) => (
                        <span
                          key={index}
                          className="inline-flex px-2 py-1 text-xs bg-blue-50 text-blue-700 rounded"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {lead.preferred_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">희망 날짜</label>
                    <p className="text-sm text-gray-900 mt-1">{lead.preferred_date}</p>
                  </div>
                )}
                {lead.message && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">메시지</label>
                    <p className="text-sm text-gray-900 mt-1 whitespace-pre-wrap">
                      {lead.message}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* 타임라인 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                타임라인
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">생성일</span>
                <span className="text-gray-900">
                  {new Date(lead.created_at).toLocaleString('ko-KR')}
                </span>
              </div>
              {lead.first_contact_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">첫 연락</span>
                  <span className="text-gray-900">
                    {new Date(lead.first_contact_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              )}
              {lead.last_contact_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">마지막 연락</span>
                  <span className="text-gray-900">
                    {new Date(lead.last_contact_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              )}
              {lead.completed_at && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">완료일</span>
                  <span className="text-gray-900">
                    {new Date(lead.completed_at).toLocaleString('ko-KR')}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 유입 경로 탭 */}
        <TabsContent value="source">
          <Card>
            <CardHeader>
              <CardTitle>유입 경로 분석</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {lead.utm.source && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">UTM Source</label>
                    <p className="text-sm text-gray-900 mt-1">{lead.utm.source}</p>
                  </div>
                )}
                {lead.utm.medium && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">UTM Medium</label>
                    <p className="text-sm text-gray-900 mt-1">{lead.utm.medium}</p>
                  </div>
                )}
                {lead.utm.campaign && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">UTM Campaign</label>
                    <p className="text-sm text-gray-900 mt-1">{lead.utm.campaign}</p>
                  </div>
                )}
                {lead.utm.content && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">UTM Content</label>
                    <p className="text-sm text-gray-900 mt-1">{lead.utm.content}</p>
                  </div>
                )}
                {lead.utm.term && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">UTM Term</label>
                    <p className="text-sm text-gray-900 mt-1">{lead.utm.term}</p>
                  </div>
                )}
                {lead.referrer && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Referrer</label>
                    <p className="text-sm text-gray-900 mt-1 truncate">{lead.referrer}</p>
                  </div>
                )}
                {lead.ip_address && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">IP Address</label>
                    <p className="text-sm text-gray-900 mt-1">{lead.ip_address}</p>
                  </div>
                )}
              </div>
              {lead.user_agent && (
                <div>
                  <label className="text-sm font-medium text-gray-500">User Agent</label>
                  <p className="text-xs text-gray-600 mt-1 font-mono break-all">
                    {lead.user_agent}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* 상태 이력 탭 */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>상태 변경 이력</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {statusLogs.map((log) => (
                  <div
                    key={log.id}
                    className="flex gap-4 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {STATUS_LABELS[log.from_status]} →{' '}
                          {STATUS_LABELS[log.to_status]}
                        </span>
                      </div>
                      {log.note && (
                        <p className="text-sm text-gray-600 mt-1">{log.note}</p>
                      )}
                      <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                        <User className="h-3 w-3" />
                        <span>{log.changed_by.full_name}</span>
                        <span>•</span>
                        <span>
                          {new Date(log.created_at).toLocaleString('ko-KR')}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
                {statusLogs.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    상태 변경 이력이 없습니다
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 메모 탭 */}
        <TabsContent value="notes">
          <Card>
            <CardHeader>
              <CardTitle>메모</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {notes.map((note) => (
                  <div
                    key={note.id}
                    className="pb-4 border-b border-gray-100 last:border-0 last:pb-0"
                  >
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {note.content}
                    </p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                      <User className="h-3 w-3" />
                      <span>{note.author.full_name}</span>
                      <span>•</span>
                      <span>
                        {new Date(note.created_at).toLocaleString('ko-KR')}
                      </span>
                    </div>
                  </div>
                ))}
                {notes.length === 0 && (
                  <p className="text-sm text-gray-500 text-center py-8">
                    메모가 없습니다
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
