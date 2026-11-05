'use client'
// 사용 가이드의 '광고 계정 연결하기' — 플랫폼별 연결 순서를 모형 화면과 커서 애니메이션으로 단계별 재생한다

import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion, useInView, useReducedMotion } from 'framer-motion'
import type { AdPlatform } from '@/lib/ads/enabled-platforms'

type Platform = AdPlatform

interface Step {
  /** 모형 브라우저 주소창에 보일 주소 */
  url: string
  /** 화면 아래 한 줄 설명 */
  caption: ReactNode
  /** 모형 화면 - 커서가 가리킬 요소는 <Target>으로 감싼다 */
  screen: ReactNode
  /** 누를 요소(<Target>)가 없는 단계에서 커서가 멈출 위치(모형 화면 기준 %, [가로, 세로]) */
  cursor: [number, number]
}

const STEP_MS = 3800

const PLATFORM_META: Record<Platform, { label: string; color: string; soft: string; text: string }> = {
  meta: { label: 'Meta', color: 'bg-[#0866FF]', soft: 'bg-blue-50', text: 'text-white' },
  google: { label: '구글', color: 'bg-[#1A73E8]', soft: 'bg-sky-50', text: 'text-white' },
  kakao: { label: '카카오', color: 'bg-[#FEE500]', soft: 'bg-yellow-50', text: 'text-gray-900' },
  naver: { label: '네이버', color: 'bg-[#03C75A]', soft: 'bg-green-50', text: 'text-white' },
}

/** 커서가 가리키는 요소 - 은은하게 깜박이는 테두리로 '여기를 누르세요'를 보여준다 */
function Target({ children, className = '' }: { children: ReactNode; className?: string }) {
  const reduce = useReducedMotion()
  return (
    <span data-guide-target className={`relative inline-block ${className}`}>
      {!reduce && (
        <motion.span
          aria-hidden
          className="absolute -inset-1 rounded-lg ring-2 ring-indigo-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.3, 1] }}
          transition={{ duration: 1.6, delay: 1.1, repeat: Infinity, repeatType: 'reverse' }}
        />
      )}
      {children}
    </span>
  )
}

function Btn({ children, className = 'bg-indigo-600 text-white' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-block px-3 py-1.5 rounded-md text-[11px] sm:text-xs font-semibold ${className}`}>{children}</span>
}

function Line({ w = 'w-24', className = '' }: { w?: string; className?: string }) {
  return <span className={`block h-2 rounded bg-gray-200 ${w} ${className}`} />
}

/** 퍼널리 광고 성과 화면 모형 - 모든 플랫폼의 첫 단계와 마지막 단계에 쓴다 */
function FunnelyScreen({ platform, phase }: { platform: Platform; phase: 'start' | 'done' | 'naver-form' | 'naver-wait' }) {
  const p = PLATFORM_META[platform]
  return (
    <div className="h-full flex text-[11px] sm:text-xs">
      <div className="w-1/5 border-r border-gray-100 p-2 space-y-2 hidden sm:block">
        <span className="block font-bold text-indigo-600">FUNNELY</span>
        {['대시보드', 'DB 현황', '랜딩 페이지'].map((m) => (
          <span key={m} className="block text-gray-400">
            {m}
          </span>
        ))}
        <span className="block font-semibold text-indigo-600 bg-indigo-50 rounded px-1">광고 성과</span>
      </div>
      <div className="flex-1 p-3 space-y-2">
        <span className="block font-bold text-gray-900 text-sm">광고 성과</span>
        {phase === 'start' && (
          <div className="rounded-lg border border-gray-200 p-2 space-y-2">
            <span className="block text-gray-500">연결된 계정 · 계정 관리 ▴</span>
            <Target>
              <Btn className="bg-blue-600 text-white">+ {p.label} 계정 {platform === 'naver' ? '추가' : '추가·다시 연결'}</Btn>
            </Target>
            <div className="rounded bg-gray-50 p-2 space-y-1">
              <span className="block font-semibold text-gray-700">
                {platform === 'naver' ? '네이버 검색광고 계정 연결하기' : `${p.label} 광고 계정 연결하기`}
              </span>
              <Line w="w-40" />
              <Line w="w-32" />
            </div>
          </div>
        )}
        {phase === 'naver-form' && (
          <div className="rounded-lg border border-gray-200 p-2 space-y-2">
            <span className="block font-semibold text-gray-700">네이버 검색광고 계정 연결하기</span>
            <span className="block text-gray-500">광고계정 ID</span>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 rounded border border-gray-300 font-mono">1234567</span>
              <Target>
                <Btn className="bg-[#03C75A] text-white">연결 요청</Btn>
              </Target>
            </div>
          </div>
        )}
        {phase === 'naver-wait' && (
          <div className="rounded-lg border border-gray-200 p-2 space-y-1.5">
            <span className="block">
              네이버 <b>주식회사 우리가게 (1234567)</b>
            </span>
            <span className="block text-blue-600">연결 대기 — 퍼널리가 초대를 수락하면 자동으로 연결됩니다</span>
            <motion.span
              className="block text-green-700 font-semibold"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
            >
              → 연결 완료, 매일 오전 성과가 들어옵니다
            </motion.span>
          </div>
        )}
        {phase === 'done' && (
          <>
            <motion.div
              className="rounded bg-green-50 text-green-800 px-2 py-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
            >
              {p.label} 광고 계정이 연결되었습니다. 최근 1년 성과를 불러왔습니다.
            </motion.div>
            <div className="grid grid-cols-3 gap-1.5">
              {['광고비', '노출', '클릭'].map((k, i) => (
                <motion.div
                  key={k}
                  className="rounded border border-gray-200 p-1.5"
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 + i * 0.15 }}
                >
                  <span className="block text-gray-400">{k}</span>
                  <span className="block font-bold text-gray-900">{['₩27,418', '368,091', '1,905'][i]}</span>
                </motion.div>
              ))}
            </div>
            <Line w="w-full" className="mt-1" />
            <Line w="w-5/6" />
          </>
        )}
      </div>
    </div>
  )
}

/** 각 플랫폼 로그인·동의 화면 모형 (실제 화면을 단순화한 그림) */
function PlatformDialog({ platform, children }: { platform: Platform; children: ReactNode }) {
  const p = PLATFORM_META[platform]
  return (
    <div className={`h-full flex items-center justify-center ${p.soft}`}>
      <div className="w-4/5 sm:w-3/5 bg-white rounded-xl shadow-md border border-gray-100 p-3 space-y-2 text-[11px] sm:text-xs">
        <span className={`inline-block w-6 h-1.5 rounded ${p.color}`} />
        {children}
      </div>
    </div>
  )
}

function stepsFor(platform: Platform): Step[] {
  const start: Step = {
    url: 'funnely.co.kr/dashboard/ad-performance',
    caption: (
      <>
        퍼널리 <b>광고 성과</b> → <b>계정 관리</b>에서 <b>+ {PLATFORM_META[platform].label} 계정 {platform === 'naver' ? '추가' : '추가·다시 연결'}</b>을 누르면
        연결 안내가 펼쳐집니다.
      </>
    ),
    screen: <FunnelyScreen platform={platform} phase="start" />,
    cursor: [42, 38],
  }
  const done: Step = {
    url: 'funnely.co.kr/dashboard/ad-performance',
    caption: '퍼널리로 자동으로 돌아오면 끝입니다. 최근 1년 성과를 불러오느라 1~2분 걸릴 수 있으니 창을 닫지 말고 기다려 주세요.',
    screen: <FunnelyScreen platform={platform} phase="done" />,
    cursor: [70, 70],
  }

  if (platform === 'meta') {
    return [
      start,
      {
        url: 'facebook.com/dialog/oauth',
        caption: <>안내의 <b>[Meta로 이동해 연결하기]</b>를 누르면 페이스북 화면이 열립니다. 광고를 집행하는 계정으로 로그인한 뒤 <b>계속</b>을 누릅니다.</>,
        screen: (
          <PlatformDialog platform="meta">
            <span className="block font-bold text-gray-900">○○○님으로 계속하시겠어요?</span>
            <Line w="w-full" />
            <Line w="w-4/5" />
            <div className="flex gap-2 pt-1">
              <Btn className="bg-gray-100 text-gray-700">취소</Btn>
              <Target>
                <Btn className="bg-[#0866FF] text-white">계속</Btn>
              </Target>
            </div>
          </PlatformDialog>
        ),
        cursor: [62, 62],
      },
      {
        url: 'facebook.com/dialog/oauth',
        caption: <>‘내 Facebook 광고와 관련 통계 자료에 액세스’ 요청이 보이면 <b>저장</b>을 누릅니다. 퍼널리는 성과를 보기만 합니다.</>,
        screen: (
          <PlatformDialog platform="meta">
            <span className="block font-bold text-gray-900">Funnely의 액세스 요청 검토</span>
            <span className="block text-gray-700">내 Facebook 광고와 관련 통계 자료에 액세스</span>
            <div className="flex justify-end gap-2 pt-2">
              <Btn className="bg-gray-100 text-gray-700">뒤로</Btn>
              <Target>
                <Btn className="bg-[#0866FF] text-white">저장</Btn>
              </Target>
            </div>
          </PlatformDialog>
        ),
        cursor: [72, 66],
      },
      {
        url: 'facebook.com/dialog/oauth',
        caption: <>‘Funnely에 연결되었습니다’가 나오면 <b>확인</b>을 누릅니다.</>,
        screen: (
          <PlatformDialog platform="meta">
            <motion.span
              className="block w-8 h-8 rounded-full bg-blue-100 mx-auto"
              initial={{ scale: 0.6 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            />
            <span className="block text-center font-bold text-gray-900">○○○님이 Funnely에 연결되었습니다</span>
            <div className="text-center pt-1">
              <Target>
                <Btn className="bg-[#0866FF] text-white px-8">확인</Btn>
              </Target>
            </div>
          </PlatformDialog>
        ),
        cursor: [50, 72],
      },
      done,
    ]
  }

  if (platform === 'google') {
    return [
      start,
      {
        url: 'accounts.google.com',
        caption: <>안내의 <b>[구글로 이동해 연결하기]</b>를 누르고, 구글 광고에 쓰는 구글 계정을 고릅니다. 없으면 ‘다른 계정 사용’으로 로그인합니다.</>,
        screen: (
          <PlatformDialog platform="google">
            <span className="block font-bold text-gray-900">계정 선택</span>
            <Target className="w-full">
              <span className="flex items-center gap-2 rounded border border-gray-200 px-2 py-1.5">
                <span className="w-4 h-4 rounded-full bg-sky-200" />
                <span>ads@우리가게.com</span>
              </span>
            </Target>
            <span className="block text-gray-500 px-2">다른 계정 사용</span>
          </PlatformDialog>
        ),
        cursor: [45, 50],
      },
      {
        url: 'accounts.google.com',
        caption: (
          <>
            권한 화면에서 Google Ads 칸을 체크하고 <b>계속</b>을 누릅니다. 문구에 ‘수정·삭제’가 있지만 구글 광고 권한이 하나로 묶여 있어서이고, 퍼널리는
            성과를 보기만 합니다.
          </>
        ),
        screen: (
          <PlatformDialog platform="google">
            <span className="block font-bold text-gray-900">Funnely에서 Google 계정에 액세스하려고 합니다</span>
            <span className="flex items-center gap-2">
              <motion.span
                className="w-3.5 h-3.5 rounded border-2 border-[#1A73E8]"
                initial={{ backgroundColor: '#ffffff' }}
                animate={{ backgroundColor: '#1A73E8' }}
                transition={{ delay: 1.3 }}
              />
              <span>Google Ads 계정과 데이터 확인·수정·생성·삭제</span>
            </span>
            <div className="flex justify-end gap-2 pt-1">
              <Btn className="bg-gray-100 text-gray-700">취소</Btn>
              <Target>
                <Btn className="bg-[#1A73E8] text-white">계속</Btn>
              </Target>
            </div>
          </PlatformDialog>
        ),
        cursor: [72, 64],
      },
      { ...done, caption: '퍼널리로 자동으로 돌아오면 끝입니다. 관리자 계정(MCC)으로 연결하면 그 아래 광고 계정도 함께 연결됩니다.' },
    ]
  }

  if (platform === 'kakao') {
    return [
      start,
      {
        url: 'accounts.kakao.com',
        caption: <>안내의 <b>[카카오로 이동해 연결하기]</b>를 누르고, 카카오모먼트 광고를 관리하는 카카오계정으로 로그인합니다.</>,
        screen: (
          <PlatformDialog platform="kakao">
            <span className="block font-bold text-gray-900">카카오계정 로그인</span>
            <span className="block rounded border border-gray-200 px-2 py-1 text-gray-400">카카오메일 아이디, 이메일, 전화번호</span>
            <span className="block rounded border border-gray-200 px-2 py-1 text-gray-400">비밀번호</span>
            <Target className="w-full">
              <span className="block text-center rounded-md bg-[#FEE500] py-1.5 font-semibold text-gray-900">로그인</span>
            </Target>
          </PlatformDialog>
        ),
        cursor: [50, 72],
      },
      {
        url: 'kauth.kakao.com/oauth/business',
        caption: <>퍼널리 안내 화면이 나오면 <b>확인하고 계속하기</b>를 누릅니다.</>,
        screen: (
          <PlatformDialog platform="kakao">
            <span className="block font-bold text-gray-900">퍼널리</span>
            <Line w="w-full" />
            <Line w="w-3/4" />
            <Target className="w-full">
              <span className="block text-center rounded-md bg-[#FEE500] py-1.5 font-semibold text-gray-900">확인하고 계속하기</span>
            </Target>
          </PlatformDialog>
        ),
        cursor: [50, 66],
      },
      {
        url: 'kauth.kakao.com/oauth/business',
        caption: <>성과를 볼 <b>광고계정을 선택</b>하고, 이어지는 마지막 화면에서 <b>동의</b>합니다.</>,
        screen: (
          <PlatformDialog platform="kakao">
            <span className="block font-bold text-gray-900">광고계정 선택</span>
            {['우리가게 광고계정', '이벤트용 광고계정'].map((name, i) => (
              <span key={name} className="flex items-center gap-2">
                <motion.span
                  className="w-3.5 h-3.5 rounded-full border-2 border-gray-400"
                  initial={{ backgroundColor: '#ffffff' }}
                  animate={i === 0 ? { backgroundColor: '#3C1E1E', borderColor: '#3C1E1E' } : {}}
                  transition={{ delay: 1.2 }}
                />
                {name}
              </span>
            ))}
            <Target className="w-full">
              <span className="block text-center rounded-md bg-[#FEE500] py-1.5 font-semibold text-gray-900">동의</span>
            </Target>
          </PlatformDialog>
        ),
        cursor: [50, 72],
      },
      { ...done, caption: '퍼널리로 자동으로 돌아오면 끝입니다. 카카오 성과는 하루 뒤에 넘어와서 어제까지 보입니다.' },
    ]
  }

  // 네이버는 로그인·동의 대신 광고주센터에서 퍼널리 아이디를 초대하고 광고계정 ID를 알려준다
  return [
    start,
    {
      url: 'ads.naver.com',
      caption: (
        <>
          네이버 광고주센터에서 <b>광고 계정 관리</b> → 연결할 계정 → <b>설정</b> → <b>권한 관리</b> → <b>회원 초대</b>로 들어갑니다.
        </>
      ),
      screen: (
        <div className="h-full flex text-[11px] sm:text-xs bg-green-50/40">
          <div className="w-1/4 border-r border-gray-100 p-2 space-y-1.5 bg-white">
            <span className="block font-semibold text-[#03C75A]">광고주센터</span>
            <span className="block text-gray-700 font-semibold">광고 계정 관리</span>
            <span className="block text-gray-400">설정</span>
            <span className="block text-gray-400">권한 관리</span>
          </div>
          <div className="flex-1 p-3 space-y-2">
            <span className="block font-bold text-gray-900">권한 관리</span>
            <Target>
              <Btn className="bg-[#03C75A] text-white">회원 초대</Btn>
            </Target>
            <Line w="w-40" />
          </div>
        </div>
      ),
      cursor: [40, 40],
    },
    {
      url: 'ads.naver.com',
      caption: (
        <>
          초대할 아이디에 퍼널리 아이디를 넣고 권한은 <b>운영 조회</b>를 골라 초대합니다. 운영 조회는 광고를 보기만 할 수 있는 권한입니다.
        </>
      ),
      screen: (
        <PlatformDialog platform="naver">
          <span className="block font-bold text-gray-900">회원 초대</span>
          <span className="block rounded border border-gray-300 px-2 py-1 font-mono">
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
              funnely
            </motion.span>
          </span>
          <span className="flex gap-2">
            <span className="px-2 py-0.5 rounded border border-gray-200 text-gray-400">운영 관리</span>
            <Target>
              <span className="px-2 py-0.5 rounded border-2 border-[#03C75A] text-[#03C75A] font-semibold">운영 조회</span>
            </Target>
          </span>
          <Btn className="bg-[#03C75A] text-white">초대</Btn>
        </PlatformDialog>
      ),
      cursor: [48, 62],
    },
    {
      url: 'ads.naver.com',
      caption: (
        <>
          광고 계정 목록에서 이름 옆 괄호 안 숫자가 <b>광고계정 ID</b>입니다. 예를 들어 ‘주식회사 우리가게(1234567)’라면 1234567입니다.
        </>
      ),
      screen: (
        <div className="h-full p-3 space-y-2 text-[11px] sm:text-xs bg-green-50/40">
          <span className="block font-bold text-gray-900">광고 계정 관리</span>
          <div className="rounded border border-gray-200 bg-white px-2 py-1.5">
            주식회사 우리가게
            <Target className="ml-1">
              <span className="font-mono font-semibold">(1234567)</span>
            </Target>
          </div>
          <Line w="w-32" />
        </div>
      ),
      cursor: [34, 34],
    },
    {
      url: 'funnely.co.kr/dashboard/ad-performance',
      caption: <>퍼널리로 돌아와 그 숫자를 넣고 <b>연결 요청</b>을 누릅니다.</>,
      screen: <FunnelyScreen platform="naver" phase="naver-form" />,
      cursor: [52, 52],
    },
    {
      url: 'funnely.co.kr/dashboard/ad-performance',
      caption: '퍼널리가 초대를 확인하면 자동으로 연결됩니다. 그때까지는 ‘연결 대기’로 보입니다.',
      screen: <FunnelyScreen platform="naver" phase="naver-wait" />,
      cursor: [60, 60],
    },
  ]
}

/**
 * 모형 화면 위 커서 - 그 단계에서 누를 요소(<Target>)의 실제 위치를 재서 그리로 움직인다.
 * 화면 폭마다 배치가 달라 %로 고정하면 버튼을 벗어나서, 누를 요소가 없는 단계만 fallback(%)을 쓴다.
 */
function GuideCursor({ fallback }: { fallback: [number, number] }) {
  const ref = useRef<HTMLDivElement>(null)
  const [to, setTo] = useState<{ left: string; top: string } | null>(null)
  useEffect(() => {
    const layer = ref.current?.parentElement
    const target = layer?.querySelector('[data-guide-target]')
    if (!layer || !target) {
      setTo({ left: `${fallback[0]}%`, top: `${fallback[1]}%` })
      return
    }
    // 들어오는 애니메이션의 이동(transform)은 둘 다 똑같이 받으므로 서로의 차이만 쓴다
    const a = layer.getBoundingClientRect()
    const b = target.getBoundingClientRect()
    setTo({ left: `${b.left - a.left + b.width / 2}px`, top: `${b.top - a.top + b.height / 2}px` })
    // stepsFor가 렌더마다 새 배열을 만들어 값으로 비교한다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fallback[0], fallback[1]])
  return (
    <motion.div
      ref={ref}
      aria-hidden
      className="absolute pointer-events-none"
      initial={{ left: '85%', top: '90%' }}
      animate={to ?? { left: '85%', top: '90%' }}
      transition={{ duration: 0.9, delay: 0.3, ease: 'easeInOut' }}
    >
      {/* 커서와 클릭 물결 */}
      <motion.span
        className="absolute -left-3 -top-3 w-6 h-6 rounded-full bg-indigo-400/40"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: [0, 1.6], opacity: [0.8, 0] }}
        transition={{ duration: 0.6, delay: 1.3 }}
      />
      <svg width="18" height="18" viewBox="0 0 24 24" className="drop-shadow">
        <path d="M4 2l16 9-7 2-3 7z" fill="#111827" stroke="#fff" strokeWidth="1.5" />
      </svg>
    </motion.div>
  )
}

export default function AdConnectGuide({ platforms }: { platforms: Platform[] }) {
  const [platform, setPlatform] = useState<Platform>(platforms[0] ?? 'meta')
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(true)
  const reduce = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  // 화면에 보일 때만 자동으로 넘긴다 (첫 접속 팝업 안에서 안 보이는 동안 돌지 않게)
  const inView = useInView(ref, { amount: 0.4 })
  const steps = stepsFor(platform)
  const step = steps[Math.min(index, steps.length - 1)]

  useEffect(() => {
    if (!playing || !inView || reduce) return
    const timer = setTimeout(() => setIndex((i) => (i + 1) % steps.length), STEP_MS)
    return () => clearTimeout(timer)
  }, [playing, inView, reduce, index, steps.length])

  const choose = (p: Platform) => {
    setPlatform(p)
    setIndex(0)
    setPlaying(true)
  }

  return (
    <div ref={ref}>
      <div className="flex flex-wrap gap-2 mb-3" role="tablist" aria-label="광고 플랫폼">
        {platforms.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            aria-selected={p === platform}
            onClick={() => choose(p)}
            className={`px-3 py-1.5 rounded-full text-sm font-semibold border transition-colors ${
              p === platform ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-200 hover:border-indigo-300'
            }`}
          >
            {PLATFORM_META[p].label}
          </button>
        ))}
      </div>

      {/* 모형 브라우저 */}
      <div className="rounded-xl border border-gray-200 overflow-hidden shadow-sm bg-white">
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 border-b border-gray-200">
          <span className="flex gap-1">
            <span className="w-2 h-2 rounded-full bg-red-300" />
            <span className="w-2 h-2 rounded-full bg-yellow-300" />
            <span className="w-2 h-2 rounded-full bg-green-300" />
          </span>
          <span className="flex-1 truncate rounded bg-white border border-gray-200 px-2 py-0.5 text-[11px] text-gray-500 font-mono">{step.url}</span>
        </div>
        <div className="relative h-56 sm:h-64 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${platform}-${index}`}
              className="absolute inset-0"
              initial={reduce ? false : { opacity: 0, x: 24 }}
              animate={{ opacity: 1, x: 0 }}
              exit={reduce ? undefined : { opacity: 0, x: -24 }}
              transition={{ duration: 0.35 }}
            >
              {step.screen}
              {!reduce && <GuideCursor fallback={step.cursor} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      <div className="mt-3 flex items-start gap-3">
        <span className="flex-shrink-0 w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
          {index + 1}
        </span>
        <p className="text-sm text-gray-700 min-h-[2.5rem]">{step.caption}</p>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex gap-1.5" aria-label="단계">
          {steps.map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`${i + 1}단계`}
              onClick={() => {
                setIndex(i)
                setPlaying(false)
              }}
              className={`h-2 rounded-full transition-all ${i === index ? 'w-6 bg-indigo-600' : 'w-2 bg-gray-300 hover:bg-gray-400'}`}
            />
          ))}
        </div>
        <div className="flex gap-2 text-sm">
          <button
            type="button"
            onClick={() => {
              setIndex((i) => (i - 1 + steps.length) % steps.length)
              setPlaying(false)
            }}
            className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            이전
          </button>
          {!reduce && (
            <button
              type="button"
              onClick={() => setPlaying((v) => !v)}
              className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              {playing ? '멈춤' : '재생'}
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIndex((i) => (i + 1) % steps.length)
              setPlaying(false)
            }}
            className="px-2.5 py-1 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            다음
          </button>
        </div>
      </div>
    </div>
  )
}
