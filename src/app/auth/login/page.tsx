'use client'

// 이메일/비밀번호 로그인 페이지 (Supabase Auth)
import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// Loading spinner component
function LoadingSpinner() {
  return (
    <svg
      className="animate-spin h-5 w-5 mr-2"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// Error message translation
function getErrorMessage(error: any): string {
  const errorCode = error?.code || error?.message || ''

  // Supabase specific error codes
  if (errorCode.includes('invalid_credentials') || errorCode.includes('Invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }

  if (errorCode.includes('email_not_confirmed') || errorCode.includes('Email not confirmed')) {
    return '이메일 인증이 필요합니다. 이메일을 확인해주세요.'
  }

  if (errorCode.includes('network') || errorCode.includes('fetch')) {
    return '네트워크 연결을 확인해주세요.'
  }

  if (errorCode.includes('timeout')) {
    return '요청 시간이 초과되었습니다. 다시 시도해주세요.'
  }

  if (errorCode.includes('rate_limit')) {
    return '너무 많은 시도가 있었습니다. 잠시 후 다시 시도해주세요.'
  }

  // Default error message
  return '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
}

const URL_ERRORS: Record<string, string> = {
  auth_failed: '인증에 실패했습니다. 다시 로그인해 주세요.',
  link_wrong_device: '이 링크는 요청하신 브라우저에서만 열 수 있습니다. 비밀번호를 재설정한 기기/브라우저에서 다시 시도해주세요.',
  account_deactivated: '비활성화된 계정입니다. 관리자에게 문의해주세요.',
}

// 미들웨어가 붙여주는 redirectTo는 반드시 사이트 내부 경로일 때만 사용한다
// (오픈 리다이렉트 방지: '/'로 시작하되 '//'로 시작하지 않는 경로만 허용)
function getSafeRedirectTo(value: string | null): string {
  if (value && value.startsWith('/') && !value.startsWith('//')) {
    return value
  }
  return '/dashboard'
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const urlError = searchParams.get('error')
  const redirectTo = getSafeRedirectTo(searchParams.get('redirectTo'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    urlError ? (URL_ERRORS[urlError] ?? '인증에 실패했습니다.') : null
  )
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(false)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) throw signInError

      // Successful login - show success message
      setSuccess(true)

      // Redirect after 1.5 seconds
      setTimeout(() => {
        router.push(redirectTo)
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setError(getErrorMessage(err))
      setLoading(false)
    }
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
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900">로그인</h1>
          </div>

          {/* Login Form */}
          {/* method="post": 하이드레이션 전 네이티브 제출 시 비밀번호가 URL에 노출되는 것을 방지 */}
          <form onSubmit={handleLogin} method="post" className="space-y-6">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                이메일
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="your@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 mb-2"
              >
                비밀번호
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="••••••••"
              />
            </div>

            {/* Success Message */}
            {success && (
              <div
                className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center"
                role="alert"
                aria-live="polite"
              >
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
                로그인 성공! 대시보드로 이동합니다...
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div
                className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start"
                role="alert"
                aria-live="assertive"
              >
                <svg
                  className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <span>{error}</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || success}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-full font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              aria-busy={loading}
            >
              {loading && <LoadingSpinner />}
              {loading ? '로그인 중...' : success ? '로그인 성공!' : '로그인'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-6 space-y-3 text-center text-sm text-gray-600">
            <div className="flex items-center justify-center gap-3">
              <Link
                href="/auth/find-email"
                className="text-gray-500 hover:text-gray-700"
              >
                아이디 찾기
              </Link>
              <span className="text-gray-300">|</span>
              <Link
                href="/auth/forgot-password"
                className="text-gray-500 hover:text-gray-700"
              >
                비밀번호 찾기
              </Link>
            </div>
            <p>
              계정이 없으신가요?{' '}
              <Link
                href="/auth/signup"
                className="text-blue-600 hover:text-blue-700 font-medium"
              >
                회원가입
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100" />
    }>
      <LoginForm />
    </Suspense>
  )
}
