'use client'
// 광고 계정 연결 버튼을 누르면 펼쳐지는 플랫폼별 초보자용 안내 (준비물·순서·안 될 때) - Meta·구글·카카오는 이동 버튼, 네이버는 입력 폼을 children으로 받는다

import { useState, type ReactNode } from 'react'

type GuidePlatform = 'meta' | 'google' | 'naver' | 'kakao'

interface Guide {
  title: string
  prepare: ReactNode
  steps: ReactNode[]
  trouble: ReactNode[]
}

// 퍼널리는 성과를 보기만 한다는 안내 - 권한 화면에서 놀라지 않도록 모든 플랫폼에 붙인다
const READ_ONLY_NOTE = '퍼널리는 광고 성과를 보기만 하고, 광고·예산을 바꾸지 않습니다.'

const GUIDES: Record<Exclude<GuidePlatform, 'naver'>, Guide> = {
  meta: {
    title: 'Meta(페이스북·인스타그램) 광고 계정 연결하기',
    prepare: '광고를 집행하는 페이스북 계정의 아이디와 비밀번호',
    steps: [
      <>아래 <b>[Meta로 이동해 연결하기]</b> 버튼을 누르면 페이스북 화면으로 넘어갑니다.</>,
      '페이스북 로그인 화면이 나오면 광고를 집행하는 계정으로 로그인합니다.',
      <>퍼널리가 요청하는 권한 화면이 나오면 <b>계속</b>(또는 허용)을 누릅니다. 광고 계정을 고르는 화면이 나오면 성과를 볼 광고 계정을 모두 체크합니다.</>,
      '퍼널리 화면으로 자동으로 돌아오면 끝입니다. 최근 1년 성과를 불러오느라 1~2분 걸릴 수 있으니 창을 닫지 말고 기다려 주세요.',
    ],
    trouble: [
      '"연결할 광고 계정이 없다"고 나오면, 로그인한 페이스북 계정이 광고 관리자에서 광고를 볼 수 있는 계정인지 확인해 주세요.',
      '중간에 창을 닫았거나 취소했다면 버튼을 다시 누르면 처음부터 할 수 있습니다.',
    ],
  },
  google: {
    title: '구글 광고(Google Ads) 계정 연결하기',
    prepare: '구글 광고(ads.google.com)에 들어갈 수 있는 구글 계정',
    steps: [
      <>아래 <b>[구글로 이동해 연결하기]</b> 버튼을 누르면 구글 화면으로 넘어갑니다.</>,
      '계정 선택 화면에서 구글 광고에 쓰는 구글 계정을 고릅니다. 목록에 없으면 "다른 계정 사용"으로 로그인합니다.',
      <>퍼널리가 구글 광고 정보를 보려고 한다는 화면이 나오면 <b>계속</b>(또는 허용)을 누릅니다. 권한 체크 칸이 있으면 체크해 주세요.</>,
      '퍼널리 화면으로 자동으로 돌아오면 끝입니다. 관리자 계정(MCC)으로 연결하면 그 아래 광고 계정도 함께 연결됩니다.',
    ],
    trouble: [
      '"연결할 수 있는 광고 계정이 없다"고 나오면, 다른 구글 계정으로 로그인했거나 광고 계정이 운영 중지된 경우입니다. 구글 광고에서 계정 상태를 확인해 주세요.',
      '중간에 창을 닫았거나 취소했다면 버튼을 다시 누르면 처음부터 할 수 있습니다.',
    ],
  },
  kakao: {
    title: '카카오모먼트 광고 계정 연결하기',
    prepare: '카카오모먼트(moment.kakao.com)에서 광고를 관리하는 카카오계정',
    steps: [
      <>아래 <b>[카카오로 이동해 연결하기]</b> 버튼을 누르면 카카오 화면으로 넘어갑니다.</>,
      '카카오 로그인 화면이 나오면 카카오모먼트 광고를 관리하는 카카오계정으로 로그인합니다.',
      <>동의 화면에서 성과를 볼 <b>광고계정을 선택</b>하고 <b>동의하고 계속하기</b>를 누릅니다.</>,
      '퍼널리 화면으로 자동으로 돌아오면 끝입니다. 카카오 성과는 어제까지 나오고, 최근 1년치를 불러오느라 1~2분 걸릴 수 있습니다.',
    ],
    trouble: [
      '연결이 안 되면, 로그인한 카카오계정에 카카오모먼트 광고계정이 있는지 확인해 주세요. 광고계정이 없는 계정은 연결할 수 없습니다.',
      '중간에 창을 닫았거나 취소했다면 버튼을 다시 누르면 처음부터 할 수 있습니다.',
    ],
  },
}

const ACTION_LABEL: Record<Exclude<GuidePlatform, 'naver'>, string> = {
  meta: 'Meta로 이동해 연결하기',
  google: '구글로 이동해 연결하기',
  kakao: '카카오로 이동해 연결하기',
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text)
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch {
          // 클립보드 권한이 없으면 아이디를 직접 보고 입력하면 된다
        }
      }}
      className="ml-2 px-2 py-0.5 rounded border border-gray-300 bg-white text-xs text-gray-700 hover:bg-gray-100"
    >
      {copied ? '복사됨' : '복사'}
    </button>
  )
}

function GuideBody({ guide, children }: { guide: Guide; children: ReactNode }) {
  return (
    <div className="mt-3 p-4 rounded-lg bg-gray-50 text-sm space-y-3">
      <p className="font-semibold text-gray-900">{guide.title}</p>
      <p className="text-gray-700">
        <span className="font-medium text-gray-900">준비물</span> · {guide.prepare}
      </p>
      <ol className="list-decimal pl-5 space-y-1.5 text-gray-700">
        {guide.steps.map((step, i) => (
          <li key={i}>{step}</li>
        ))}
      </ol>
      {children}
      <div className="text-xs text-gray-500 space-y-1">
        <p className="font-medium text-gray-600">잘 안 될 때</p>
        <ul className="list-disc pl-4 space-y-0.5">
          {guide.trouble.map((t, i) => (
            <li key={i}>{t}</li>
          ))}
        </ul>
        <p>{READ_ONLY_NOTE}</p>
      </div>
    </div>
  )
}

export default function ConnectGuide({
  platform,
  naverInviteId,
  naverForm,
}: {
  platform: GuidePlatform
  naverInviteId: string
  /** 네이버 광고계정 ID 입력칸과 '연결 요청' 버튼 */
  naverForm: ReactNode
}) {
  if (platform !== 'naver') {
    return (
      <GuideBody guide={GUIDES[platform]}>
        {/* 서버 라우트가 state 쿠키를 심고 각 플랫폼 로그인·동의 화면으로 바로 보낸다 */}
        <a
          href={`/api/ad-accounts/connect/${platform}`}
          className="inline-block px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700"
        >
          {ACTION_LABEL[platform]}
        </a>
      </GuideBody>
    )
  }

  // 네이버는 로그인·동의 방식이 없어, 고객이 네이버 광고주센터에서 퍼널리 아이디를 초대하고 광고계정 ID를 알려준다
  const naverGuide: Guide = {
    title: '네이버 검색광고 계정 연결하기',
    prepare: '네이버 검색광고를 관리하는 네이버 아이디 (광고계정에 다른 사람을 초대할 수 있는 권한)',
    steps: [
      <>
        <a href="https://ads.naver.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
          네이버 광고주센터 열기
        </a>
        를 눌러 새 창에서 로그인합니다.
      </>,
      <>
        왼쪽 메뉴 <b>[광고 계정 관리]</b>에서 연결할 광고계정을 누르고, <b>[설정]</b> → <b>[권한 관리]</b> → <b>[회원 초대]</b> 순서로
        들어갑니다.
      </>,
      <>
        초대할 아이디에 <span className="font-mono font-semibold">{naverInviteId || '(준비 중)'}</span>
        {naverInviteId && <CopyButton text={naverInviteId} />}
        {' '}를 넣고, 권한은 <b>운영 조회</b>를 골라 초대합니다. 운영 조회는 광고를 보기만 할 수 있는 권한입니다.
      </>,
      <>
        다시 <b>[광고 계정 관리]</b> 목록에서 광고계정 이름 옆 괄호 안의 숫자를 확인합니다. 예를 들어 &quot;주식회사 퍼널리(1234567)&quot;라면{' '}
        <b>1234567</b>이 광고계정 ID입니다.
      </>,
      '그 숫자를 아래 칸에 넣고 [연결 요청]을 누릅니다. 퍼널리가 초대를 확인하면 자동으로 연결되고, 그때까지는 "연결 대기"로 보입니다.',
    ],
    trouble: [
      '[회원 초대] 메뉴가 안 보이면, 로그인한 아이디에 초대 권한이 없는 경우입니다. 광고계정 책임자에게 초대를 부탁해 주세요.',
      '초대는 30일 동안 유효합니다. 연결 요청을 하고 오래 "연결 대기"로 남아 있으면 퍼널리 고객센터로 알려 주세요.',
    ],
  }
  return <GuideBody guide={naverGuide}>{naverForm}</GuideBody>
}
