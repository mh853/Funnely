'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasSession, setHasSession] = useState<boolean | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session)
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }
    if (password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) throw error

      setSuccess(true)
      await supabase.auth.signOut()
      setTimeout(() => router.push('/auth/login'), 2500)
    } catch {
      setError('비밀번호 변경에 실패했습니다. 링크가 만료되었을 수 있습니다.')
    } finally {
      setLoading(false)
    }
  }

  if (hasSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        {/* Brand logo */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-block">
            <span className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Funnely
            </span>
          </Link>
          <p className="mt-1 text-sm text-gray-500">비즈니스 성장을 위한 올인원 플랫폼</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">새 비밀번호 설정</h1>
            <p className="text-gray-600 text-sm">사용할 새 비밀번호를 입력해주세요.</p>
          </div>

          {!hasSession ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mx-auto">
                <svg className="w-8 h-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">링크가 만료되었습니다</h2>
              <p className="text-sm text-gray-600">비밀번호 재설정 링크의 유효시간이 지났습니다.</p>
              <Link
                href="/auth/forgot-password"
                className="block mt-2 text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                비밀번호 찾기 다시 시도하기
              </Link>
            </div>
          ) : success ? (
            <div className="text-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mx-auto">
                <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-900">비밀번호가 변경되었습니다</h2>
              <p className="text-sm text-gray-600">새 비밀번호로 로그인해주세요. 잠시 후 이동합니다...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="8자 이상 입력"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  새 비밀번호 확인
                </label>
                <input
                  id="confirmPassword"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="비밀번호 재입력"
                />
              </div>

              {error && (
                <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-full font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '변경 중...' : '비밀번호 변경'}
              </button>
            </form>
          )}
        </div>

        {!success && hasSession && (
          <div className="mt-4 text-center">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
              ← 로그인으로 돌아가기
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
