'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { decryptPhone } from '@/lib/encryption/phone'

interface LandingPage {
  id: string
  title: string
  slug: string
}

interface Lead {
  id: string
  name: string
  phone: string | null
  status: string
  contract_completed_at: string | null
  landing_pages: LandingPage | LandingPage[] | null
}

interface ReservationsClientProps {
  initialLeads: Lead[]
  companyId: string
}

export default function ReservationsClient({
  initialLeads,
  companyId,
}: ReservationsClientProps) {
  const [leads, setLeads] = useState<Lead[]>(initialLeads)
  const supabase = createClient()

  // 디버깅용 로그
  console.log('ReservationsClient initialLeads:', initialLeads)
  console.log('ReservationsClient leads state:', leads)

  // Supabase Realtime 구독
  useEffect(() => {
    console.log('Setting up Realtime subscription for companyId:', companyId)

    // leads 테이블의 변경사항 구독
    const channel = supabase
      .channel('reservations-realtime')
      .on(
        'postgres_changes',
        {
          event: '*', // INSERT, UPDATE, DELETE 모두 감지
          schema: 'public',
          table: 'leads',
          filter: `company_id=eq.${companyId}`,
        },
        async (payload) => {
          console.log('🔔 Realtime update received:', payload)

          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            const newLead = payload.new as any

            // contract_completed 상태이고 contract_completed_at이 있는 경우만 처리
            if (
              newLead.status === 'contract_completed' &&
              newLead.contract_completed_at
            ) {
              // landing_pages 정보를 가져오기 위해 추가 쿼리
              const { data: leadWithRelations } = await supabase
                .from('leads')
                .select(
                  `
                  *,
                  landing_pages (
                    id,
                    title,
                    slug
                  )
                `
                )
                .eq('id', newLead.id)
                .single()

              if (leadWithRelations) {
                setLeads((prevLeads) => {
                  // 기존에 있는 리드인지 확인
                  const existingIndex = prevLeads.findIndex(
                    (l) => l.id === leadWithRelations.id
                  )

                  if (existingIndex >= 0) {
                    // 업데이트: 기존 리드 교체
                    const updated = [...prevLeads]
                    updated[existingIndex] = leadWithRelations as Lead
                    return updated
                  } else {
                    // 새로 추가
                    return [...prevLeads, leadWithRelations as Lead]
                  }
                })
              }
            } else if (payload.eventType === 'UPDATE') {
              // 상태가 contract_completed가 아니게 변경된 경우 목록에서 제거
              const updatedLead = payload.new as any
              if (updatedLead.status !== 'contract_completed') {
                setLeads((prevLeads) =>
                  prevLeads.filter((l) => l.id !== updatedLead.id)
                )
              }
            }
          } else if (payload.eventType === 'DELETE') {
            // 삭제된 리드 제거
            const deletedLead = payload.old as any
            setLeads((prevLeads) =>
              prevLeads.filter((l) => l.id !== deletedLead.id)
            )
          }
        }
      )
      .subscribe((status) => {
        console.log('🔌 Realtime subscription status:', status)
      })

    // 클린업
    return () => {
      console.log('🔌 Cleaning up Realtime subscription')
      supabase.removeChannel(channel)
    }
  }, [companyId, supabase])

  // 날짜별로 리드 그룹화
  const { leadsByDate, sortedDates } = useMemo(() => {
    const grouped: { [key: string]: Lead[] } = {}

    leads.forEach((lead) => {
      if (lead.contract_completed_at) {
        const date = new Date(lead.contract_completed_at).toISOString().split('T')[0]
        if (!grouped[date]) {
          grouped[date] = []
        }
        grouped[date].push(lead)
      }
    })

    // 각 날짜 내에서 시간순 정렬
    Object.keys(grouped).forEach((date) => {
      grouped[date].sort((a, b) => {
        const timeA = new Date(a.contract_completed_at!).getTime()
        const timeB = new Date(b.contract_completed_at!).getTime()
        return timeA - timeB
      })
    })

    return {
      leadsByDate: grouped,
      sortedDates: Object.keys(grouped).sort(),
    }
  }, [leads])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-500 to-teal-600 rounded-2xl p-8 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">예약 스케줄</h1>
            <p className="mt-2 text-emerald-100">
              계약 완료된 예약 일정을 관리합니다
            </p>
          </div>
          <div className="text-right">
            <div className="text-4xl font-bold">{leads.length}</div>
            <div className="text-sm text-emerald-100">총 예약 건수</div>
          </div>
        </div>
      </div>

      {/* Schedule List */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {sortedDates.length === 0 ? (
          <div className="p-12 text-center">
            <div className="text-gray-400 text-lg mb-2">예약된 일정이 없습니다</div>
            <p className="text-sm text-gray-500">
              계약 완료 시 날짜/시간을 지정하면 여기에 표시됩니다
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {sortedDates.map((date) => {
              const dateLeads = leadsByDate[date]
              const dateObj = new Date(date)
              const formattedDate = dateObj.toLocaleDateString('ko-KR', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                weekday: 'long',
              })

              return (
                <div key={date} className="p-6 hover:bg-gray-50 transition-colors">
                  {/* Date Header */}
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex-shrink-0 w-16 h-16 bg-emerald-100 rounded-xl flex items-center justify-center">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-emerald-600">
                          {dateObj.getDate()}
                        </div>
                        <div className="text-xs text-emerald-600">
                          {dateObj.toLocaleDateString('ko-KR', { month: 'short' })}
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {formattedDate}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {dateLeads.length}건의 예약
                      </p>
                    </div>
                  </div>

                  {/* Reservation Items */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 ml-0 md:ml-20">
                    {dateLeads.map((lead) => {
                      const time = new Date(lead.contract_completed_at!).toLocaleTimeString(
                        'ko-KR',
                        {
                          hour: '2-digit',
                          minute: '2-digit',
                        }
                      )
                      const phone = lead.phone ? decryptPhone(lead.phone) : null
                      // landing_pages가 배열일 수도 있고 객체일 수도 있음
                      const landingPage = Array.isArray(lead.landing_pages)
                        ? lead.landing_pages[0]
                        : lead.landing_pages

                      return (
                        <Link
                          key={lead.id}
                          href={`/dashboard/leads?id=${lead.id}`}
                          className="group relative bg-white border-2 border-gray-200 rounded-xl p-4 hover:border-emerald-500 hover:shadow-lg transition-all duration-200"
                        >
                          {/* Time Badge */}
                          <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs font-bold px-3 py-1 rounded-full shadow-lg">
                            {time}
                          </div>

                          {/* Lead Info */}
                          <div className="space-y-2">
                            <div className="font-semibold text-gray-900 group-hover:text-emerald-600 transition-colors">
                              {lead.name}
                            </div>

                            {landingPage?.title && (
                              <div className="text-xs text-gray-500">
                                {landingPage.title}
                              </div>
                            )}

                            {/* Contact Info - Shows on Hover */}
                            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                              {phone && (
                                <div className="text-sm text-emerald-600 font-medium">
                                  {phone}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Hover Indicator */}
                          <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <svg
                              className="w-5 h-5 text-emerald-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </Link>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="flex justify-center gap-4">
        <Link
          href="/dashboard/leads?status=contract_completed"
          className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-emerald-600 bg-white border-2 border-emerald-600 rounded-full hover:bg-emerald-50 transition-all duration-300 shadow-md hover:shadow-lg"
        >
          모든 계약 완료 건 보기
        </Link>
        <Link
          href="/dashboard/calendar?status=contract_completed"
          className="inline-flex items-center justify-center px-8 py-3 text-base font-medium text-white bg-gradient-to-r from-emerald-500 to-teal-600 rounded-full hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg hover:shadow-xl"
        >
          캘린더 뷰로 보기
        </Link>
      </div>
    </div>
  )
}
