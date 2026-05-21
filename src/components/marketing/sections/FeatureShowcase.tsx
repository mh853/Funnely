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
        {/* Header */}
        <div className="flex items-center gap-3 bg-gray-50 px-4 py-3 border-b border-gray-100">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center`}>
            <PaintBrushIcon className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-900">랜딩페이지 수정</p>
            <p className="text-xs text-gray-400">랜딩페이지 설정을 수정하고 업데이트하세요</p>
          </div>
        </div>

        {/* Section 1: 랜딩 페이지 */}
        <div className="border-b border-gray-200">
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${accentColor}`} />
            <span className="text-xs font-semibold text-gray-700">랜딩 페이지</span>
          </div>
          <div className="flex divide-x divide-gray-100">
            {/* Left: Settings form */}
            <div className="flex-1 p-3 space-y-2.5 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">상태</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-400">OFF</span>
                  <div className="w-8 h-4 rounded-full bg-gray-200" />
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">랜딩페이지 주소</p>
                <div className="flex items-center gap-1 h-7 rounded border border-gray-200 px-2">
                  <span className="text-xs text-gray-400 truncate">funnely.co.kr/</span>
                  <span className="text-xs font-medium text-gray-700">sample</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">랜딩페이지 이름</p>
                <div className="h-7 rounded border border-gray-200 flex items-center px-2">
                  <span className="text-xs text-gray-700">이벤트 랜딩페이지</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">노출 요소</p>
                <div className="space-y-1">
                  {['DB수집 마감 타이머', '실시간 수집현황', '전화연결 버튼'].map((item) => (
                    <div key={item} className="flex items-center gap-1.5">
                      <div className={`w-3.5 h-3.5 rounded-sm bg-gradient-to-r ${accentColor} flex items-center justify-center shrink-0`}>
                        <CheckCircleIcon className="h-2.5 w-2.5 text-white" />
                      </div>
                      <span className="text-xs text-gray-600">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            {/* Right: Landing phone */}
            <div className="w-40 shrink-0 p-3 bg-gray-50 flex justify-center">
              <div className="w-28 rounded-[14px] border-2 border-gray-800 bg-white overflow-hidden shadow-md">
                <div className="bg-gray-800 py-0.5 flex justify-center">
                  <div className="w-8 h-1 rounded-full bg-gray-500" />
                </div>
                <div className={`bg-gradient-to-br ${accentColor} px-3 py-2.5`}>
                  <div className="flex justify-between items-center mb-1.5">
                    <span className="text-[10px] font-bold text-white">D-3일</span>
                    <span className="text-[9px] text-white/80">실시간 현황</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/30">
                    <div className="h-1.5 rounded-full bg-white w-2/3" />
                  </div>
                  <p className="text-[8px] text-white/70 mt-1 text-center">현재 128명 신청완료</p>
                </div>
                <div className="p-2.5 space-y-2">
                  <div className="h-6 rounded border border-gray-200 bg-gray-50 flex items-center px-2">
                    <span className="text-[10px] text-gray-400">이름</span>
                  </div>
                  <div className="h-6 rounded border border-gray-200 bg-gray-50 flex items-center px-2">
                    <span className="text-[10px] text-gray-400">전화번호</span>
                  </div>
                  <div className="h-6 rounded border border-gray-200 bg-gray-50 flex items-center px-2">
                    <span className="text-[10px] text-gray-400">지역 선택 ▾</span>
                  </div>
                  <div className={`h-7 rounded-full bg-gradient-to-r ${accentColor} flex items-center justify-center`}>
                    <span className="text-[10px] font-semibold text-white">신청하기</span>
                  </div>
                  <div className="flex items-center justify-center gap-1">
                    <PhoneIcon className="h-3 w-3 text-gray-400" />
                    <span className="text-[9px] text-gray-400">전화연결</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: 완료 페이지 */}
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
            <div className={`w-1 h-4 rounded-full bg-gradient-to-b ${accentColor}`} />
            <span className="text-xs font-semibold text-gray-700">완료 페이지</span>
          </div>
          <div className="flex divide-x divide-gray-100">
            {/* Left: Completion settings */}
            <div className="flex-1 p-3 space-y-2.5 min-w-0">
              <div>
                <p className="text-xs text-gray-500 mb-1">신청완료 이미지</p>
                <div className="h-14 rounded border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center gap-2">
                  <PhotoIcon className="h-4 w-4 text-gray-300" />
                  <span className="text-[10px] text-gray-400">이미지 업로드</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">완료 메시지</p>
                <div className="h-8 rounded border border-gray-200 bg-gray-50 flex items-center px-2">
                  <span className="text-[10px] text-gray-700">신청이 완료되었습니다.</span>
                </div>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">안내 멘트</p>
                <div className="h-8 rounded border border-gray-200 bg-gray-50 flex items-center px-2">
                  <span className="text-[10px] text-gray-400">담당자가 빠른 시일 내 연락드립니다.</span>
                </div>
              </div>
            </div>
            {/* Right: Completion phone */}
            <div className="w-40 shrink-0 p-3 bg-gray-50 flex justify-center">
              <div className="w-28 rounded-[14px] border-2 border-gray-800 bg-white overflow-hidden shadow-md">
                <div className="bg-gray-800 py-0.5 flex justify-center">
                  <div className="w-8 h-1 rounded-full bg-gray-500" />
                </div>
                <div className={`bg-gradient-to-br ${accentColor} p-4 flex items-center justify-center`}>
                  <div className="w-10 h-10 rounded-full bg-white/25 flex items-center justify-center">
                    <CheckCircleIcon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div className="p-2.5 space-y-2">
                  <p className="text-[10px] font-semibold text-gray-900 text-center leading-tight">신청이 완료되었습니다.<br />곧 연락드리겠습니다.</p>
                  <div className="rounded-lg bg-blue-50 border border-blue-100 p-1.5">
                    <p className="text-[9px] text-blue-600 leading-tight">담당자가 빠른 시일 내에 연락드릴 예정입니다.</p>
                  </div>
                  <div className="h-6 rounded-full bg-gray-100 flex items-center justify-center">
                    <span className="text-[10px] text-gray-500">× 창 닫기</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'db') {
    const rows = [
      { date: '05-08', name: '김민준', phone: '010-****-1234', device: 'PC', status: '상담전', manager: '홍길동', color: 'bg-yellow-100 text-yellow-700' },
      { date: '05-07', name: '이서연', phone: '010-****-5678', device: 'Mobile', status: '진행중', manager: '김철수', color: 'bg-blue-100 text-blue-700' },
      { date: '05-07', name: '박지호', phone: '010-****-9012', device: 'PC', status: '예약확정', manager: '이영희', color: 'bg-green-100 text-green-700' },
      { date: '05-06', name: '최수아', phone: '010-****-3456', device: 'Mobile', status: '거절', manager: '홍길동', color: 'bg-red-100 text-red-700' },
    ]
    return (
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100">
          <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center shrink-0`}>
            <ChartBarIcon className="h-4 w-4 text-white" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-gray-900">DB 현황</p>
            <p className="text-xs text-gray-400 truncate">수집된 고객 DB 관리</p>
          </div>
          <div className="flex gap-1 shrink-0">
            <div className={`h-6 rounded-lg bg-gradient-to-r ${accentColor} px-2 flex items-center`}>
              <span className="text-xs font-medium text-white whitespace-nowrap">DB 배분</span>
            </div>
            <div className="h-6 rounded-lg border border-gray-200 px-2 flex items-center">
              <span className="text-xs text-gray-600 whitespace-nowrap">+ 수동추가</span>
            </div>
            <div className="h-6 rounded-lg border border-gray-200 px-2 flex items-center">
              <span className="text-xs text-gray-600 whitespace-nowrap">↓ Excel</span>
            </div>
          </div>
        </div>
        {/* Filter bar */}
        <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-1.5 overflow-x-auto">
          <div className="h-6 rounded border border-gray-200 px-2 flex items-center gap-1 shrink-0">
            <span className="text-[10px] text-gray-600">📅 05-01 ~ 05-08</span>
            <span className="text-gray-300 ml-0.5">×</span>
          </div>
          <div className="h-6 rounded border border-gray-200 px-2 flex items-center shrink-0">
            <span className="text-[10px] text-gray-500">랜딩페이지 전체 ▾</span>
          </div>
          <div className="h-6 rounded border border-gray-200 px-2 flex items-center shrink-0">
            <span className="text-[10px] text-gray-500">결과 전체 ▾</span>
          </div>
        </div>
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full" style={{ fontSize: '10px' }}>
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {['신청일', '이름', '전화번호', '기기', '결과', '담당자'].map((h) => (
                  <th key={h} className="px-1.5 py-2 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name} className="border-b border-gray-50">
                  <td className="px-1.5 py-2 text-gray-500 whitespace-nowrap">{r.date}</td>
                  <td className="px-1.5 py-2 font-medium text-gray-900">{r.name}</td>
                  <td className="px-1.5 py-2 text-gray-500 whitespace-nowrap">{r.phone}</td>
                  <td className="px-1.5 py-2 text-gray-500">{r.device}</td>
                  <td className="px-1.5 py-2">
                    <span className={`rounded-full px-1.5 py-0.5 font-medium whitespace-nowrap ${r.color}`}>{r.status}</span>
                  </td>
                  <td className="px-1.5 py-2 text-gray-500">{r.manager}</td>
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
    const trafficRows = [
      { date: '05-01', total: 128, pc: 74, pcPct: '57.8', mobile: 52, mobPct: '40.6', tablet: 2, tabPct: '1.6' },
      { date: '05-02', total: 95, pc: 61, pcPct: '64.2', mobile: 31, mobPct: '32.6', tablet: 3, tabPct: '3.2' },
      { date: '05-03', total: 143, pc: 89, pcPct: '62.2', mobile: 48, mobPct: '33.6', tablet: 6, tabPct: '4.2' },
    ]
    const convRows = [
      { date: '05-01', total: 21, totalPct: '16.4', pc: 13, pcPct: '17.6', mobile: 8, mobPct: '15.4' },
      { date: '05-02', total: 18, totalPct: '18.9', pc: 11, pcPct: '18.0', mobile: 7, mobPct: '22.6' },
      { date: '05-03', total: 28, totalPct: '19.6', pc: 18, pcPct: '20.2', mobile: 10, mobPct: '20.8' },
    ]
    const Pct = ({ children }: { children: string }) => (
      <span className="block text-gray-400" style={{ fontSize: '8px' }}>({children}%)</span>
    )
    return (
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center`}>
              <ChartPieIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">트래픽 분석</p>
              <p className="text-xs text-gray-400">트래픽 현황 및 유입경로를 분석합니다</p>
            </div>
          </div>
          <div className="flex items-center gap-1" style={{ fontSize: '11px' }}>
            <button className="px-1 text-gray-400">‹</button>
            <span className="font-semibold text-gray-700">2026년 5월</span>
            <button className="px-1 text-gray-400">›</button>
          </div>
        </div>
        <div className="flex divide-x divide-gray-100">
          {/* Left: 트래픽 유입 */}
          <div className="flex-1 min-w-0">
            <div className="px-2 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <span className="font-medium text-gray-700" style={{ fontSize: '10px' }}>트래픽 유입</span>
              <span className="text-gray-400" style={{ fontSize: '9px' }}>↓ 엑셀</span>
            </div>
            <table className="w-full" style={{ fontSize: '10px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['날짜', '합계', 'PC', 'MOBILE', 'TAB'].map((h) => (
                    <th key={h} className="px-1 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {trafficRows.map((r) => (
                  <tr key={r.date} className="border-b border-gray-50">
                    <td className="px-1 py-1.5 text-gray-600 whitespace-nowrap">{r.date}</td>
                    <td className="px-1 py-1.5 font-medium text-gray-900">{r.total}</td>
                    <td className="px-1 py-1.5 text-blue-600">{r.pc}<Pct>{r.pcPct}</Pct></td>
                    <td className="px-1 py-1.5 text-green-600">{r.mobile}<Pct>{r.mobPct}</Pct></td>
                    <td className="px-1 py-1.5 text-purple-600">{r.tablet}<Pct>{r.tabPct}</Pct></td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                  <td className="px-1 py-1.5 text-gray-700">합계</td>
                  <td className="px-1 py-1.5 font-bold text-gray-900">366</td>
                  <td className="px-1 py-1.5 text-blue-700">224</td>
                  <td className="px-1 py-1.5 text-green-700">131</td>
                  <td className="px-1 py-1.5 text-purple-700">11</td>
                </tr>
              </tbody>
            </table>
          </div>
          {/* Right: DB 전환수 */}
          <div className="flex-1 min-w-0">
            <div className="px-2 py-1.5 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
              <span className="font-medium text-gray-700" style={{ fontSize: '10px' }}>DB 전환수</span>
              <span className="text-gray-400" style={{ fontSize: '9px' }}>↓ 엑셀</span>
            </div>
            <table className="w-full" style={{ fontSize: '10px' }}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {['날짜', '합계', 'PC', 'MOBILE'].map((h) => (
                    <th key={h} className="px-1 py-1.5 text-left text-gray-500 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {convRows.map((r) => (
                  <tr key={r.date} className="border-b border-gray-50">
                    <td className="px-1 py-1.5 text-gray-600 whitespace-nowrap">{r.date}</td>
                    <td className="px-1 py-1.5 font-medium text-gray-900">{r.total}<Pct>{r.totalPct}</Pct></td>
                    <td className="px-1 py-1.5 text-blue-600">{r.pc}<Pct>{r.pcPct}</Pct></td>
                    <td className="px-1 py-1.5 text-green-600">{r.mobile}<Pct>{r.mobPct}</Pct></td>
                  </tr>
                ))}
                <tr className="border-t border-gray-200 bg-gray-50 font-medium">
                  <td className="px-1 py-1.5 text-gray-700">합계</td>
                  <td className="px-1 py-1.5 font-bold text-gray-900">67<Pct>18.3</Pct></td>
                  <td className="px-1 py-1.5 text-blue-700">42</td>
                  <td className="px-1 py-1.5 text-green-700">25</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }

  if (type === 'schedule') {
    const dayLabels = ['월', '화', '수', '목', '금', '토', '일']
    const calendarDates = [
      [null, null, null, 1, 2, 3, 4],
      [5, 6, 7, 8, 9, 10, 11],
      [12, 13, 14, 15, 16, 17, 18],
      [19, 20, 21, 22, 23, 24, 25],
      [26, 27, 28, 29, 30, 31, null],
    ]
    const events: Record<number, { label: string; color: string }> = {
      12: { label: '김민준', color: 'bg-blue-100 text-blue-700' },
      15: { label: '이서연', color: 'bg-green-100 text-green-700' },
      20: { label: '박지호', color: 'bg-green-100 text-green-700' },
      23: { label: '최수아', color: 'bg-blue-100 text-blue-700' },
    }
    return (
      <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center`}>
              <CalendarDaysIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-900">DB 스케줄</p>
              <p className="text-xs text-gray-400">DB 상담 일정과 약속을 관리합니다</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-6 rounded border border-gray-200 px-2 flex items-center">
              <span className="text-xs text-gray-500">전체 콜담당자 ▾</span>
            </div>
            <div className="flex rounded-lg border border-gray-200 overflow-hidden text-xs">
              <div className={`px-2 py-1 bg-gradient-to-r ${accentColor} text-white font-medium`}>월별</div>
              <div className="px-2 py-1 text-gray-500 bg-white">주별</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-100">
          <span className="text-sm font-bold text-gray-900">2026년 5월</span>
          <div className="flex items-center gap-1">
            <button className="text-gray-400 text-xs">‹</button>
            <span className="text-xs text-blue-600 border border-blue-200 rounded px-1.5 py-0.5">이번달</span>
            <button className="text-gray-400 text-xs">›</button>
          </div>
          <span className="ml-auto text-xs text-gray-400">0 건</span>
        </div>
        <div className="p-2">
          <div className="grid grid-cols-7 mb-1">
            {dayLabels.map((d, i) => (
              <div key={d} className={`text-center text-xs font-medium py-1 ${i === 5 ? 'text-blue-500' : i === 6 ? 'text-red-500' : 'text-gray-500'}`}>{d}</div>
            ))}
          </div>
          {calendarDates.map((week, wi) => (
            <div key={wi} className="grid grid-cols-7 border-t border-gray-100">
              {week.map((date, di) => (
                <div key={di} className="min-h-[40px] border-r border-gray-100 p-0.5 last:border-r-0">
                  {date && (
                    <div className="flex flex-col gap-0.5">
                      <span className={`w-5 h-5 flex items-center justify-center text-xs font-medium mx-auto ${
                        date === 8 ? 'bg-blue-600 text-white rounded-full' :
                        di === 5 ? 'text-blue-500' : di === 6 ? 'text-red-500' : 'text-gray-700'
                      }`}>{date}</span>
                      {events[date] && (
                        <span className={`rounded px-0.5 text-xs leading-tight truncate ${events[date].color}`}>{events[date].label}</span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2 px-3 py-2 border-t border-gray-100">
          {[
            { label: 'DB 스케쥴', count: 12, color: 'bg-blue-50 text-blue-700' },
            { label: '예약 스케쥴', count: 8, color: 'bg-green-50 text-green-700' },
          ].map((s) => (
            <div key={s.label} className={`rounded-xl p-2.5 ${s.color}`}>
              <p className="text-xs font-medium">{s.label}</p>
              <p className="text-xl font-bold">{s.count}건</p>
            </div>
          ))}
        </div>
      </div>
    )
  }

  // pixel
  return (
    <div className="rounded-2xl bg-white shadow-xl ring-1 ring-gray-200 overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-100">
        <div className={`w-7 h-7 rounded-lg bg-gradient-to-br ${accentColor} flex items-center justify-center`}>
          <SignalIcon className="h-4 w-4 text-white" />
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-900">설정</p>
          <p className="text-xs text-gray-400">회사 정보 및 계정 설정을 관리합니다</p>
        </div>
      </div>
      <div className="p-3 space-y-2">
        <p className="text-xs font-semibold text-gray-500 px-1">연동</p>
        <div className="space-y-1.5">
          {[
            { icon: '🔔', title: '이메일 알림', desc: '리드 유입 알림 수신' },
            { icon: '📊', title: '픽셀 관리', desc: 'Facebook, Google, Kakao' },
            { icon: '🔗', title: '광고 플랫폼 API', desc: 'Meta, Kakao, Google Ads' },
            { icon: '📋', title: '리드 상태 관리', desc: 'DB현황 결과 상태 설정' },
            { icon: '📈', title: 'Sheets 동기화', desc: 'Google Sheets 자동 연동' },
          ].map((item) => (
            <div key={item.title} className="flex items-center justify-between rounded-xl border border-gray-100 bg-gray-50 px-3 py-2">
              <div className="flex items-center gap-2">
                <span className="text-sm">{item.icon}</span>
                <div>
                  <p className="text-xs font-medium text-gray-900">{item.title}</p>
                  <p className="text-xs text-gray-400">{item.desc}</p>
                </div>
              </div>
              <span className="text-gray-300 text-xs">›</span>
            </div>
          ))}
        </div>
        <p className="text-xs font-semibold text-gray-500 px-1 pt-1">관리</p>
        <div className="grid grid-cols-3 gap-1.5">
          {[
            { icon: '💳', title: '구독 관리' },
            { icon: '📄', title: '결제 내역' },
            { icon: '👥', title: '팀 관리' },
          ].map((item) => (
            <div key={item.title} className="rounded-xl border border-gray-100 bg-gray-50 px-2 py-2.5 flex flex-col items-center gap-1">
              <span className="text-base">{item.icon}</span>
              <p className="text-xs font-medium text-gray-700 text-center">{item.title}</p>
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
        { threshold: 0, rootMargin: '-5% 0px -85% 0px' }
      )
      observer.observe(ref)
      observers.push(observer)
    })

    return () => observers.forEach((o) => o.disconnect())
  }, [])

  const scrollToFeature = (index: number) => {
    setActiveIndex(index)
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
                      <h3 className="text-3xl font-bold text-gray-900">{feature.name}</h3>
                    </div>
                    <p className="text-4xl font-bold text-gray-900 mb-4 whitespace-pre-line leading-tight">
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
                            <p className="text-base font-semibold text-gray-900 mb-0.5">{sub.title}</p>
                            <p className="text-sm text-gray-500 leading-relaxed">{sub.description}</p>
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
