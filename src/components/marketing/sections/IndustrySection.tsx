'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { XMarkIcon, CheckIcon } from '@heroicons/react/24/outline'

type Industry = {
  id: string
  name: string
  emoji: string
  headline: string
  subheadline: string
  features: string[]
  formFields: string[]
  ctaText: string
}

const industries: Industry[] = [
  {
    id: 'education',
    name: '교육',
    emoji: '📚',
    headline: '○○ 교육원 무료 체험 신청',
    subheadline: '지금 신청하시면 1주일 무료 체험 기회를 드립니다!',
    features: ['DB 수집 마감 타이머', '실시간 신청 현황', '상담신청 버튼'],
    formFields: ['이름', '연락처', '희망 과목'],
    ctaText: '무료 체험 신청하기',
  },
  {
    id: 'insurance',
    name: '보험',
    emoji: '🛡️',
    headline: '내 보험료 무료 진단 받기',
    subheadline: '3분만에 내 보험 상태를 확인하고 최적의 플랜을 찾아드립니다.',
    features: ['전화연결 버튼', '실시간 DB 수집현황', 'DB 수집 폼'],
    formFields: ['이름', '연락처', '나이'],
    ctaText: '무료 진단 받기',
  },
  {
    id: 'hospital',
    name: '병원',
    emoji: '🏥',
    headline: '○○ 병원 온라인 예약',
    subheadline: '전화 없이 간편하게 예약하세요. 당일 예약 가능.',
    features: ['예약 스케쥴 연동', '상담신청 버튼', '신청완료 페이지'],
    formFields: ['이름', '연락처', '희망 진료과'],
    ctaText: '진료 예약하기',
  },
  {
    id: 'loan',
    name: '대출',
    emoji: '💰',
    headline: '한도 조회 후 최저금리 확인',
    subheadline: '신용점수에 영향 없는 한도 조회. 지금 바로 확인하세요.',
    features: ['DB 수집 폼', '전화연결 버튼', '실시간 DB 수집현황'],
    formFields: ['이름', '연락처', '직업'],
    ctaText: '한도 조회하기',
  },
  {
    id: 'expo',
    name: '박람회',
    emoji: '🎪',
    headline: '○○ 박람회 사전 등록',
    subheadline: '사전 등록 시 입장료 무료! 한정 인원으로 진행됩니다.',
    features: ['DB 수집 마감 타이머', '실시간 신청 현황', '신청완료 이미지'],
    formFields: ['이름', '연락처', '참가 인원'],
    ctaText: '사전 등록하기',
  },
  {
    id: 'single',
    name: '단일 페이지',
    emoji: '📄',
    headline: '내 서비스를 소개합니다',
    subheadline: '원하는 이미지와 내용만으로 간단한 소개 페이지를 만들어보세요.',
    features: ['이미지/영상 삽입', '상담신청 버튼', '전화연결 버튼'],
    formFields: ['이름', '연락처'],
    ctaText: '문의하기',
  },
]

export default function IndustrySection() {
  const [selectedIndustry, setSelectedIndustry] = useState<Industry | null>(null)

  return (
    <>
      {/* Industry popup modal */}
      <AnimatePresence>
        {selectedIndustry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedIndustry(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Mock landing page preview */}
              <div className="bg-gray-50 border-b border-gray-100">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 bg-white px-3 py-2 border-b border-gray-100">
                  <div className="flex gap-1">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-400" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-400" />
                  </div>
                  <div className="flex-1 mx-2 h-5 rounded bg-gray-100 flex items-center px-2">
                    <span className="text-xs text-gray-400">funnely.io/landing/example</span>
                  </div>
                </div>

                {/* Mock page content */}
                <div className="p-4 space-y-3">
                  {/* Hero area */}
                  <div className="rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 p-4 text-white">
                    <div className="text-lg font-bold mb-1">{selectedIndustry.headline}</div>
                    <p className="text-xs text-blue-100 mb-3">{selectedIndustry.subheadline}</p>
                    {/* Timer mock */}
                    {selectedIndustry.features.includes('DB 수집 마감 타이머') && (
                      <div className="flex gap-1 mb-3">
                        {['02', '14', '35'].map((t, i) => (
                          <div key={i} className="bg-white/20 rounded px-2 py-1 text-center">
                            <span className="text-sm font-bold">{t}</span>
                            <div className="text-xs opacity-70">{['일', '시', '분'][i]}</div>
                          </div>
                        ))}
                      </div>
                    )}
                    {/* DB count mock */}
                    {selectedIndustry.features.includes('실시간 신청 현황') && (
                      <div className="bg-white/20 rounded-lg px-3 py-1.5 text-xs mb-3">
                        현재 <span className="font-bold text-yellow-300">247명</span> 신청 완료
                      </div>
                    )}
                  </div>

                  {/* Form mock */}
                  <div className="space-y-2">
                    {selectedIndustry.formFields.map((field) => (
                      <div key={field} className="h-8 rounded-lg bg-gray-100 flex items-center px-3">
                        <span className="text-xs text-gray-400">{field}</span>
                      </div>
                    ))}
                    <div className="h-10 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 flex items-center justify-center">
                      <span className="text-xs font-semibold text-white">{selectedIndustry.ctaText}</span>
                    </div>
                  </div>

                  {/* Features chips */}
                  <div className="flex flex-wrap gap-1">
                    {selectedIndustry.features.map((feat) => (
                      <span key={feat} className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                        <CheckIcon className="h-3 w-3" />
                        {feat}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="p-4 flex items-center justify-between">
                <p className="text-xs text-gray-500">예시 랜딩페이지입니다</p>
                <button
                  onClick={() => setSelectedIndustry(null)}
                  className="rounded-full bg-gray-100 p-1.5 hover:bg-gray-200 transition-colors"
                >
                  <XMarkIcon className="h-4 w-4 text-gray-600" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <section className="py-24 sm:py-32 bg-gradient-to-b from-white to-blue-50">
        <div className="mx-auto max-w-7xl px-6 lg:px-8">
          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center mb-12"
          >
            <h2 className="text-base font-semibold leading-7 text-blue-600">
              업종별 활용
            </h2>
            <p className="mt-2 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl">
              초보자도{' '}
              <span className="bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                5분이면 완성!
              </span>
            </p>
            <p className="mt-6 text-lg leading-8 text-gray-600">
              교육, 보험, 병원, 대출, 박람회 등 업종별로 쉽게 활용하실 수 있습니다.
            </p>
            <p className="mt-3 text-sm text-gray-500">
              타이머, 실시간 DB 수집현황, DB 수집 폼, 상담신청 버튼, 전화연결 버튼, 신청완료 페이지 등<br className="hidden sm:block" />
              원하는 옵션을 선택하여 나만의 랜딩페이지 혹은 홈페이지 제작이 가능합니다.
            </p>
          </motion.div>

          {/* Industry buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="flex flex-wrap items-center justify-center gap-3 mb-12"
          >
            {industries.map((industry) => (
              <button
                key={industry.id}
                onClick={() => setSelectedIndustry(industry)}
                className="inline-flex items-center gap-2 rounded-full border-2 border-gray-200 bg-white px-6 py-3 text-base font-semibold text-gray-700 shadow-sm hover:border-blue-500 hover:text-blue-600 hover:shadow-md transition-all"
              >
                <span>{industry.emoji}</span>
                {industry.name}
              </button>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-center text-sm text-gray-400 mb-12"
          >
            업종 버튼을 클릭하면 예시 랜딩페이지를 확인할 수 있습니다
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4"
          >
            <Link
              href="/auth/signup?plan=pro&trial=true"
              className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-4 text-base font-semibold text-white shadow-xl hover:shadow-2xl hover:scale-105 transition-all"
            >
              7일 무료체험
            </Link>
            <Link
              href="/auth/signup"
              className="inline-flex items-center justify-center rounded-full border-2 border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-900 hover:border-blue-600 hover:text-blue-600 transition-all"
            >
              회원가입
            </Link>
          </motion.div>
        </div>
      </section>
    </>
  )
}
