'use client'

import { useRef, useState, useEffect } from 'react'
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  PaintBrushIcon,
  ChartBarIcon,
  ChartPieIcon,
  CalendarDaysIcon,
  SignalIcon,
  CheckCircleIcon,
  ClockIcon,
  UsersIcon,
  PhoneIcon,
  DocumentTextIcon,
  PhotoIcon,
} from '@heroicons/react/24/outline'

type SubFeature = {
  icon: React.ElementType
  title: string
  description: string
}

type Feature = {
  id: string
  number: string
  name: string
  headline: string
  description: string
  subFeatures: SubFeature[]
  accentColor: string
  bgFrom: string
  bgTo: string
  mockType: 'landing' | 'db' | 'analytics' | 'schedule' | 'pixel'
}

const features: Feature[] = [
  {
    id: 'landing',
    number: '01',
    name: '랜딩페이지 생성',
    headline: '개발자 없이 누구나\n5분만에 랜딩페이지 완성',
    description:
      '원하는 조건으로 실시간 DB 수집현황, DB 수집 마감 타이머, 전화연결 버튼, 완료페이지 등 다양한 기능을 이용하실 수 있습니다.',
    accentColor: 'from-pink-500 to-rose-500',
    bgFrom: 'from-pink-50',
    bgTo: 'to-rose-50',
    mockType: 'landing',
    subFeatures: [
      { icon: PhotoIcon, title: '이미지 or 영상 삽입', description: '원하는 이미지와 동영상만 있다면 간단히 랜딩페이지 URL 생성이 가능합니다.' },
      { icon: ClockIcon, title: 'DB수집 마감 타이머', description: 'DB 수집 마감 타이머 날짜 설정이 가능합니다.' },
      { icon: ChartBarIcon, title: '실시간 DB 수집현황', description: '실시간으로 유입되는 DB 수집현황 노출이 가능합니다.' },
      { icon: DocumentTextIcon, title: 'DB 수집 폼', description: '이름, 연락처, 단답형/선택형 질문 등을 추가하여 DB 수집이 가능합니다.' },
      { icon: UsersIcon, title: '상담신청 버튼', description: '상담신청 버튼 추가/삭제로 랜딩페이지 혹은 홈페이지로 활용이 가능합니다.' },
      { icon: PhoneIcon, title: '전화연결 버튼', description: '전화연결 버튼을 추가 및 삭제할 수 있습니다.' },
      { icon: PhotoIcon, title: '신청완료 이미지', description: '신청 완료 후 노출할 이미지를 설정할 수 있습니다.' },
      { icon: CheckCircleIcon, title: '완료 메시지 (텍스트)', description: '신청 완료 후 표시될 안내 메시지를 자유롭게 작성할 수 있습니다.' },
      { icon: DocumentTextIcon, title: '안내 멘트 (텍스트)', description: '랜딩페이지 하단에 표시할 안내 문구를 설정할 수 있습니다.' },
    ],
  },
  {
    id: 'db',
    number: '02',
    name: '실시간 DB 수집 및 관리',
    headline: '실시간 수집 DB를\n한 곳에서 통합 관리',
    description:
      '실시간으로 수집된 DB를 간편하게 관리하실 수 있습니다. 콜센터 운영 중인 경우, DB배분 기능으로 콜 관리를 할 수 있으며, 퍼널리 외 매체의 DB도 수동추가로 통합 관리가 가능합니다.',
    accentColor: 'from-blue-500 to-cyan-500',
    bgFrom: 'from-blue-50',
    bgTo: 'to-cyan-50',
    mockType: 'db',
    subFeatures: [
      { icon: ChartBarIcon, title: 'DB 현황', description: '랜딩페이지로 수집된 DB 리스트를 확인할 수 있습니다. 수집된 DB 항목, 콜 담당자, 상담 담당자, 콜 결과 등 확인이 가능합니다.' },
      { icon: UsersIcon, title: 'DB 배분', description: '수집된 DB를 콜 담당자에게 임의로 배분합니다.' },
      { icon: DocumentTextIcon, title: 'DB 수동 추가', description: '퍼널리 이외의 방법으로 수집된 DB는 수동추가 기능 이용이 가능합니다.' },
      { icon: CheckCircleIcon, title: '결과 처리', description: '상담 결과를 선택하여 스케쥴을 관리할 수 있습니다.' },
    ],
  },
  {
    id: 'analytics',
    number: '03',
    name: '트래픽 분석 & DB 리포트',
    headline: '유입부터 전환까지\n데이터로 성과를 증명',
    description:
      'DB 유입 경로를 PC·모바일·태블릿으로 구별하여 분석합니다. 트래픽 유입경로뿐만 아니라 전환된 경로까지 체크하고, 일별·월별 DB 결과를 한눈에 확인할 수 있습니다.',
    accentColor: 'from-violet-500 to-purple-500',
    bgFrom: 'from-violet-50',
    bgTo: 'to-purple-50',
    mockType: 'analytics',
    subFeatures: [
      { icon: ChartPieIcon, title: '트래픽 분석', description: 'DB 유입 경로를 PC, MOBILE, TABLET으로 구별하여 분석합니다.' },
      { icon: SignalIcon, title: '유입경로 전환 분석', description: '트래픽 유입경로뿐만 아니라 전환된 경로까지 체크할 수 있습니다.' },
      { icon: ChartBarIcon, title: 'DB 리포트', description: '일별·월별 유입된 DB의 결과를 한눈에 체크할 수 있습니다.' },
      { icon: DocumentTextIcon, title: '데일리 성과 측정', description: 'DB 유입, 상담전, 거절, 진행중, 예약확정, 결제 횟수, 결제금액 등 데일리 성과 측정이 가능합니다.' },
    ],
  },
  {
    id: 'schedule',
    number: '04',
    name: '콜센터 스케쥴 관리',
    headline: 'DB 스케쥴부터 예약까지\n한 번에 관리',
    description:
      '실시간으로 수집된 DB를 간편하게 관리하실 수 있습니다. DB 스케쥴, 예약 스케쥴, 자동 콜 DB 분배, DB 리포트 등 아웃바운드 콜, 상담예약 과정까지 한번에 관리하실 수 있습니다.',
    accentColor: 'from-green-500 to-emerald-500',
    bgFrom: 'from-green-50',
    bgTo: 'to-emerald-50',
    mockType: 'schedule',
    subFeatures: [
      { icon: CalendarDaysIcon, title: 'DB 스케쥴', description: '상담전, 추가상담 필요한 DB 위주로 DB 스케쥴에서 한번에 확인이 가능합니다.' },
      { icon: DocumentTextIcon, title: '월별·주간 스케쥴 노트', description: '월별, 주간별 스케쥴 노트를 통해 간편하게 관리 가능합니다.' },
      { icon: CheckCircleIcon, title: '예약 스케쥴', description: '상담 예약이 완료된 DB에 대해서 예약 스케쥴로 관리할 수 있습니다.' },
      { icon: UsersIcon, title: '방문·내원 스케쥴', description: '추가 상담, 예약 방문, 내원 등의 스케쥴 관리가 필요하신 경우 활용하시면 좋습니다.' },
    ],
  },
  {
    id: 'pixel',
    number: '05',
    name: '광고 픽셀 & API 연동',
    headline: '광고 픽셀·API 연동으로\n전환 효율 극대화',
    description:
      '광고를 진행하시는 경우, 픽셀 및 API 연동이 가능하므로 성과 측정 및 효율 증대를 쉽게 하실 수 있습니다. 연동 가이드를 제공하여 쉽게 설정이 가능합니다.',
    accentColor: 'from-indigo-500 to-blue-500',
    bgFrom: 'from-indigo-50',
    bgTo: 'to-blue-50',
    mockType: 'pixel',
    subFeatures: [
      { icon: SignalIcon, title: '광고 픽셀 연동', description: '메타, 구글 등 주요 광고 플랫폼의 픽셀 연동이 가능합니다.' },
      { icon: DocumentTextIcon, title: 'API 연동 가이드', description: '광고 진행을 위한 연동 가이드를 제공합니다.' },
      { icon: ChartPieIcon, title: '효율 및 전환 체크', description: '픽셀 연동 후 전환 이벤트 발생 여부를 체크할 수 있습니다.' },
    ],
  },
]

function MockUI({ type, accentColor }: { type: Feature['mockType']; accentColor: string }) {
  if (type === 'landing') {
    return (
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 border-b border-gray-100">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 mx-3 h-5 rounded bg-gray-200 flex items-center px-2">
            <span className="text-xs text-gray-400">funnely.io/landing/sample</span>
          </div>
        </div>
        <div className={`bg-gradient-to-br ${accentColor} p-6 text-white`}>
          <div className="inline-flex items-center gap-2 bg-white/20 rounded-full px-3 py-1 text-xs mb-3">
            <ClockIcon className="h-3.5 w-3.5" />
            <span>마감까지 02일 14시간 35분</span>
          </div>
          <div className="h-6 w-48 bg-white/30 rounded mb-2" />
          <div className="h-4 w-64 bg-white/20 rounded mb-4" />
          <div className="bg-yellow-400/30 rounded-lg px-3 py-2 text-xs">
            현재 <span className="font-bold">247명</span> 신청 완료
          </div>
        </div>
        <div className="p-4 space-y-2">
          {['이름', '연락처', '문의 내용'].map((f) => (
            <div key={f} className="h-10 rounded-lg border border-gray-200 flex items-center px-3">
              <span className="text-xs text-gray-400">{f}</span>
            </div>
          ))}
          <div className={`h-11 rounded-full bg-gradient-to-r ${accentColor} flex items-center justify-center`}>
            <span className="text-sm font-semibold text-white">상담 신청하기</span>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'db') {
    const rows = [
      { name: '김민준', phone: '010-****-1234', status: '상담전', result: '—', color: 'bg-yellow-100 text-yellow-700' },
      { name: '이서연', phone: '010-****-5678', status: '진행중', result: '관심', color: 'bg-blue-100 text-blue-700' },
      { name: '박지호', phone: '010-****-9012', status: '예약확정', result: '확정', color: 'bg-green-100 text-green-700' },
      { name: '최수아', phone: '010-****-3456', status: '거절', result: '거절', color: 'bg-red-100 text-red-700' },
    ]
    return (
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">DB 현황</span>
          <div className={`h-7 rounded-full bg-gradient-to-r ${accentColor} px-3 flex items-center`}>
            <span className="text-xs font-medium text-white">+ DB 배분</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['이름', '연락처', '상태', '결과'].map((h) => (
                  <th key={h} className="px-3 py-2 text-left text-gray-500 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-gray-50">
                  <td className="px-3 py-2.5 font-medium text-gray-900">{r.name}</td>
                  <td className="px-3 py-2.5 text-gray-500">{r.phone}</td>
                  <td className="px-3 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${r.color}`}>{r.status}</span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{r.result}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50">
          {[
            { label: '총 DB', value: '128', sub: '오늘 +12' },
            { label: '진행중', value: '43', sub: '33.6%' },
            { label: '확정', value: '21', sub: '16.4%' },
          ].map((s) => (
            <div key={s.label} className="bg-white rounded-xl p-2.5 text-center shadow-sm">
              <p className="text-xs text-gray-500">{s.label}</p>
              <p className="text-lg font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (type === 'analytics') {
    return (
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm font-semibold text-gray-900 mb-3">유입 경로 분석</p>
          <div className="space-y-2">
            {[
              { label: 'PC', value: 58, color: 'bg-violet-500' },
              { label: 'Mobile', value: 35, color: 'bg-purple-400' },
              { label: 'Tablet', value: 7, color: 'bg-fuchsia-300' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-12">{item.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }} />
                </div>
                <span className="text-xs font-medium text-gray-700 w-8 text-right">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
        <div className="p-4">
          <p className="text-sm font-semibold text-gray-900 mb-3">데일리 DB 리포트</p>
          <div className="grid grid-cols-3 gap-2 mb-3">
            {[
              { label: 'DB 유입', value: '128', delta: '+12' },
              { label: '예약확정', value: '21', delta: '+3' },
              { label: '전환율', value: '16.4%', delta: '+1.2%' },
            ].map((s) => (
              <div key={s.label} className="bg-gray-50 rounded-xl p-2 text-center">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="text-base font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-green-500 font-medium">{s.delta}</p>
              </div>
            ))}
          </div>
          <div className="flex items-end gap-1 h-16 bg-gray-50 rounded-xl p-2">
            {[30, 55, 45, 70, 60, 85, 75].map((h, i) => (
              <div
                key={i}
                className="flex-1 rounded-t bg-violet-400 opacity-80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (type === 'schedule') {
    const days = ['월', '화', '수', '목', '금']
    const events = [
      { day: 0, time: '10:00', name: '김민준 상담', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      { day: 1, time: '14:00', name: '이서연 예약', color: 'bg-green-100 text-green-700 border-green-200' },
      { day: 2, time: '11:00', name: '박지호 내원', color: 'bg-purple-100 text-purple-700 border-purple-200' },
      { day: 3, time: '15:30', name: '최수아 상담', color: 'bg-blue-100 text-blue-700 border-blue-200' },
      { day: 4, time: '13:00', name: '정하윤 예약', color: 'bg-green-100 text-green-700 border-green-200' },
    ]
    return (
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">2026년 4월 스케쥴</span>
          <div className="flex gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-600">DB 스케쥴</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-600">예약</span>
          </div>
        </div>
        <div className="p-4">
          <div className="grid grid-cols-5 gap-1.5">
            {days.map((d, i) => {
              const ev = events.find((e) => e.day === i)
              return (
                <div key={d} className="text-center">
                  <p className="text-xs text-gray-400 mb-1.5">{d}</p>
                  {ev ? (
                    <div className={`rounded-lg border p-1.5 text-xs ${ev.color}`}>
                      <p className="font-medium">{ev.time}</p>
                      <p className="leading-tight">{ev.name}</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border border-dashed border-gray-200 p-1.5 h-14" />
                  )}
                </div>
              )
            })}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2 px-4 pb-4">
          {[
            { label: 'DB 스케쥴', count: 12, color: 'bg-blue-50 text-blue-700' },
            { label: '예약 스케쥴', count: 8, color: 'bg-green-50 text-green-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-3 ${s.color}`}>
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-2xl font-bold">{s.count}건</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // pixel
  return (
    <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <p className="text-sm font-semibold text-gray-900 mb-3">광고 픽셀 연동 현황</p>
        <div className="space-y-2">
          {[
            { name: 'Meta Pixel', status: '연동됨', color: 'bg-blue-100 text-blue-700', icon: '📘' },
            { name: 'Google Ads', status: '연동됨', color: 'bg-green-100 text-green-700', icon: '🔍' },
            { name: 'Kakao Pixel', status: '미연동', color: 'bg-gray-100 text-gray-500', icon: '💬' },
          ].map((p) => (
            <div key={p.name} className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">{p.icon}</span>
                <span className="text-sm font-medium text-gray-900">{p.name}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${p.color}`}>{p.status}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="p-4">
        <p className="text-sm font-semibold text-gray-900 mb-3">전환 이벤트</p>
        <div className="space-y-2">
          {[
            { event: 'Lead (신청완료)', count: 128, delta: '+12' },
            { event: 'ViewContent (페이지뷰)', count: 1247, delta: '+89' },
            { event: 'Contact (전화연결)', count: 43, delta: '+5' },
          ].map((e) => (
            <div key={e.event} className="flex items-center justify-between text-xs">
              <span className="text-gray-600">{e.event}</span>
              <div className="flex items-center gap-2">
                <span className="font-bold text-gray-900">{e.count}</span>
                <span className="text-green-500 font-medium">{e.delta}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function FeatureShowcase() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [activeIndex, setActiveIndex] = useState(0)
  const sectionRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const observers: IntersectionObserver[] = []

    sectionRefs.current.forEach((ref, index) => {
      if (!ref) return
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            setActiveIndex(index)
          }
        },
        { threshold: 0.5, rootMargin: '-10% 0px -40% 0px' }
      )
      observer.observe(ref)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const scrollToFeature = (index: number) => {
    sectionRefs.current[index]?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }

  return (
    <section className="relative bg-gray-50 py-24 sm:py-32" id="feature-showcase">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        {/* Section header */}
        <div className="mx-auto max-w-2xl text-center mb-20">
          <h2 className="text-base font-semibold leading-7 text-blue-600">기능 상세</h2>
          <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
            퍼널리가{' '}
            <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              할 수 있는 것들
            </span>
          </p>
          <p className="mt-6 text-lg text-gray-600">
            스크롤을 내리며 각 기능을 확인해보세요
          </p>
        </div>

        {/* Sticky layout */}
        <div className="relative grid grid-cols-1 gap-16 lg:grid-cols-[280px_1fr]" ref={containerRef}>
          {/* Left sticky nav */}
          <div className="hidden lg:block">
            <div className="sticky top-32 space-y-2">
              {features.map((feature, index) => (
                <button
                  key={feature.id}
                  onClick={() => scrollToFeature(index)}
                  className={`w-full flex items-center gap-3 rounded-2xl px-4 py-3 text-left transition-all duration-300 ${
                    activeIndex === index
                      ? 'bg-white shadow-md ring-1 ring-gray-200'
                      : 'hover:bg-white/60'
                  }`}
                >
                  <span
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      activeIndex === index
                        ? `bg-gradient-to-r ${feature.accentColor} text-white shadow-lg`
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {feature.number}
                  </span>
                  <span
                    className={`text-sm font-semibold transition-colors duration-300 ${
                      activeIndex === index ? 'text-gray-900' : 'text-gray-500'
                    }`}
                  >
                    {feature.name}
                  </span>
                  {activeIndex === index && (
                    <motion.div
                      layoutId="activeIndicator"
                      className={`ml-auto w-1.5 h-6 rounded-full bg-gradient-to-b ${feature.accentColor}`}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Right scrolling content */}
          <div className="space-y-32">
            {features.map((feature, index) => (
              <div
                key={feature.id}
                ref={(el) => { sectionRefs.current[index] = el }}
                id={`feature-${feature.id}`}
              >
                <motion.div
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-100px' }}
                  transition={{ duration: 0.6 }}
                >
                  {/* Feature header */}
                  <div className={`rounded-3xl bg-gradient-to-br ${feature.bgFrom} ${feature.bgTo} p-8 mb-8`}>
                    <div className="flex items-center gap-3 mb-4">
                      <span className={`inline-flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-r ${feature.accentColor} text-white font-bold text-sm shadow-lg`}>
                        {feature.number}
                      </span>
                      <h3 className="text-2xl font-bold text-gray-900">{feature.name}</h3>
                    </div>
                    <p className="text-3xl font-bold text-gray-900 mb-4 whitespace-pre-line leading-tight">
                      {feature.headline}
                    </p>
                    <p className="text-gray-600 leading-relaxed">{feature.description}</p>
                  </div>

                  {/* Mock UI + Sub-features split */}
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
                    {/* Mock UI */}
                    <div>
                      <MockUI type={feature.mockType} accentColor={feature.accentColor} />
                    </div>

                    {/* Sub-features list */}
                    <div className="space-y-3">
                      {feature.subFeatures.map((sub, si) => (
                        <motion.div
                          key={sub.title}
                          initial={{ opacity: 0, x: 20 }}
                          whileInView={{ opacity: 1, x: 0 }}
                          viewport={{ once: true }}
                          transition={{ delay: si * 0.07, duration: 0.4 }}
                          className="flex gap-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 hover:shadow-md transition-shadow"
                        >
                          <div className={`flex-shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-r ${feature.accentColor} shadow-sm`}>
                            <sub.icon className="h-4.5 w-4.5 text-white" aria-hidden="true" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900 mb-0.5">{sub.title}</p>
                            <p className="text-xs text-gray-500 leading-relaxed">{sub.description}</p>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </div>

                  {/* Per-feature CTAs */}
                  <div className="mt-8 flex flex-col sm:flex-row gap-3">
                    <Link
                      href="/auth/signup?plan=pro&trial=true"
                      className={`inline-flex items-center justify-center rounded-full bg-gradient-to-r ${feature.accentColor} px-6 py-3 text-sm font-semibold text-white shadow-lg hover:shadow-xl hover:scale-105 transition-all`}
                    >
                      7일 무료체험
                    </Link>
                    <Link
                      href="/auth/signup"
                      className="inline-flex items-center justify-center rounded-full border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 hover:border-gray-400 transition-all"
                    >
                      회원가입
                    </Link>
                  </div>
                </motion.div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
