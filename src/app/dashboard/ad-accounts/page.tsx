// =============================================================================
// [임시 비활성화] 광고 계정 연동 페이지
// 나중에 사용할 수 있으므로 주석 처리하여 보관합니다.
// =============================================================================

import { redirect } from 'next/navigation'

export default async function AdAccountsPage() {
  // 임시로 대시보드로 리다이렉트
  redirect('/dashboard')
}

// =============================================================================
// 원본 코드 (나중에 복원 시 사용)
// 파일 위치: src/app/dashboard/ad-accounts/page.tsx.backup
// =============================================================================
//
// import { createClient } from '@/lib/supabase/server'
// import { redirect } from 'next/navigation'
// import AdAccountsList from '@/components/ad-accounts/AdAccountsList'
// import ConnectAccountButton from '@/components/ad-accounts/ConnectAccountButton'
// import MetaConnectionSection from '@/components/ad-accounts/MetaConnectionSection'
//
// 원본 코드가 길어서 별도 백업 파일로 관리합니다.
// 복원 시 이 파일의 원본 내용은 git history에서 확인하세요.
// git show HEAD~1:src/app/dashboard/ad-accounts/page.tsx
