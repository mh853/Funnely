// 로그인/회원가입/비밀번호 재설정 등 /auth/* 전체를 검색엔진 색인에서 제외하는 레이아웃 (노션 35번)
import type { Metadata } from 'next'

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return children
}
