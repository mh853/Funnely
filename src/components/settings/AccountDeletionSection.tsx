'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface AccountDeletionSectionProps {
  userEmail: string
  userRole: string
  teamMemberCount: number
  hasPaidSubscription: boolean
  subscriptionPlanName?: string
}

export default function AccountDeletionSection({
  userEmail,
  userRole,
  teamMemberCount,
  hasPaidSubscription,
  subscriptionPlanName,
}: AccountDeletionSectionProps) {
  const router = useRouter()
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmEmail, setConfirmEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isOwner = userRole === 'company_owner' || userRole === 'hospital_owner'

  const handleDelete = async () => {
    setError(null)

    if (confirmEmail !== userEmail) {
      setError('이메일이 일치하지 않습니다.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmEmail }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해주세요.')
        return
      }

      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/?withdrawn=true')
    } catch {
      setError('오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-red-100">
        <div className="bg-gradient-to-r from-red-50 to-rose-50 px-6 py-4 border-b border-red-100">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 rounded-lg p-2">
              <svg className="h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-red-900">위험 구역</h2>
              <p className="text-sm text-red-600">이 구역의 작업은 되돌릴 수 없습니다.</p>
            </div>
          </div>
        </div>
        <div className="px-6 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">계정 탈퇴</h3>
            <p className="text-sm text-gray-500 mt-1">
              탈퇴 후 30일간 데이터가 보존되며, 이후 영구 삭제됩니다.
              {isOwner && teamMemberCount > 0 && (
                <span className="block mt-1 text-orange-600 font-medium">
                  현재 팀원 {teamMemberCount}명이 함께 비활성화됩니다.
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => setModalOpen(true)}
            className="flex-shrink-0 px-4 py-2 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors"
          >
            계정 탈퇴
          </button>
        </div>
      </div>

      {/* 탈퇴 확인 모달 */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-gray-900">정말 탈퇴하시겠습니까?</h3>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* 안내 사항 */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-semibold text-amber-800">탈퇴 전 확인해주세요</p>
                <ul className="text-sm text-amber-700 space-y-1.5 list-none">
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-xs flex items-center justify-center font-bold">!</span>
                    모든 랜딩페이지, 리드 데이터 접근이 불가해집니다.
                  </li>
                  {isOwner && hasPaidSubscription && (
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-xs flex items-center justify-center font-bold">!</span>
                      <span>
                        <span className="font-semibold">{subscriptionPlanName}</span> 구독이 자동으로 취소됩니다.
                      </span>
                    </li>
                  )}
                  {isOwner && teamMemberCount > 0 && (
                    <li className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-xs flex items-center justify-center font-bold">!</span>
                      <span>
                        팀원 <span className="font-semibold">{teamMemberCount}명</span>의 계정도 함께 비활성화됩니다.
                      </span>
                    </li>
                  )}
                  <li className="flex items-start gap-2">
                    <span className="mt-0.5 flex-shrink-0 w-4 h-4 rounded-full bg-amber-200 text-amber-800 text-xs flex items-center justify-center font-bold">!</span>
                    데이터는 <span className="font-semibold">30일간 보존</span>된 후 영구 삭제됩니다.
                  </li>
                </ul>
              </div>

              {/* 이메일 확인 */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  탈퇴를 확인하려면 이메일 주소를 입력하세요
                </label>
                <p className="text-xs text-gray-500 mb-2">
                  확인 이메일:{' '}
                  <span className="font-medium text-gray-700">{userEmail}</span>
                </p>
                <input
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => {
                    setConfirmEmail(e.target.value)
                    setError(null)
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  placeholder="이메일 주소 입력"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  setModalOpen(false)
                  setConfirmEmail('')
                  setError(null)
                }}
                disabled={loading}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                disabled={loading || confirmEmail !== userEmail}
                className="flex-1 px-4 py-3 bg-red-600 text-white text-sm font-semibold rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
              >
                {loading ? '처리 중...' : '계정 탈퇴'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
