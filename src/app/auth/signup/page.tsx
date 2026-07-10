'use client'

/**
 * Signup Page
 * New user registration
 */

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

// 가입 직후 자동 로그인 실패 시 표시할 한글 메시지 (login/page.tsx의 매핑과 동일한 기준)
function getSignInErrorMessage(error: any): string {
  const errorCode = error?.code || error?.message || ''

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

  return '회원가입은 완료되었지만 자동 로그인에 실패했습니다. 로그인 페이지에서 다시 시도해주세요.'
}

export default function SignupPage() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
    phone: '',
    companyName: '',
  })
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [companyNameDuplicate, setCompanyNameDuplicate] = useState(false)
  const companyCheckTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const name = formData.companyName.trim()
    setCompanyNameDuplicate(false)
    if (!name) return

    if (companyCheckTimer.current) clearTimeout(companyCheckTimer.current)
    companyCheckTimer.current = setTimeout(async () => {
      try {
        const res = await fetch('/api/auth/check-company-name', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name }),
        })
        const data = await res.json()
        setCompanyNameDuplicate(data.exists)
      } catch {
        // 네트워크 오류 시 무시 (가입은 계속 진행 가능)
      }
    }, 500)

    return () => {
      if (companyCheckTimer.current) clearTimeout(companyCheckTimer.current)
    }
  }, [formData.companyName])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      return
    }

    if (formData.password.length < 8) {
      setError('비밀번호는 최소 8자 이상이어야 합니다.')
      return
    }

    setLoading(true)

    try {
      // Call our API route instead of direct Supabase auth
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
          phone: formData.phone || null,
          companyName: formData.companyName || null,
          businessNumber: null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '회원가입에 실패했습니다.')
      }

      // Successful signup - now sign in
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (signInError) {
        setError(getSignInErrorMessage(signInError))
        return
      }

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err: any) {
      setError(err.message || '회원가입에 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 px-4 py-6">
      <div className="max-w-md w-full">
        {/* Brand logo */}
        <div className="text-center mb-3">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Funnely
            </span>
          </Link>
          <p className="mt-0.5 text-xs text-gray-500">비즈니스 성장을 위한 올인원 플랫폼</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl px-8 py-6">
          {/* Header */}
          <div className="text-center mb-5">
            <h1 className="text-xl font-bold text-gray-900">회원가입</h1>
          </div>

          {/* Signup Form */}
          {/* method="post": JS가 아직 하이드레이션되기 전에 폼이 네이티브 제출되는 경우를
              대비한 안전장치. 없으면 기본 GET으로 제출되어 비밀번호가 URL 쿼리 파라미터에
              그대로 노출된다 (브라우저 기록/서버 로그/Referrer에 남을 수 있음). */}
          <form onSubmit={handleSignup} method="post" className="space-y-3">
            {/* Full Name */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                이름
              </label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                required
                value={formData.fullName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="홍길동"
              />
            </div>

            {/* Company Name */}
            <div>
              <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-1">
                회사명
              </label>
              <input
                id="companyName"
                name="companyName"
                type="text"
                required
                value={formData.companyName}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="회사 또는 브랜드명"
              />
              {companyNameDuplicate && (
                <p className="mt-1 text-xs text-amber-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                  </svg>
                  이미 같은 이름의 회사가 등록되어 있습니다. 동일한 이름으로도 가입할 수 있습니다.
                </p>
              )}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                핸드폰 번호 <span className="text-red-500">*</span>
              </label>
              <input
                id="phone"
                name="phone"
                type="tel"
                required
                value={formData.phone}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="010-0000-0000"
              />
              <p className="mt-0.5 text-xs text-gray-400">
                아이디(이메일) 찾기에 사용됩니다.
              </p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                이메일
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="your@email.com"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="최소 8자 이상"
              />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                비밀번호 확인
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                placeholder="비밀번호 재입력"
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-2.5 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-2.5 rounded-full font-semibold shadow-md hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '가입 중...' : '회원가입'}
            </button>
          </form>

          {/* Footer Links */}
          <div className="mt-4 text-center text-sm text-gray-600">
            <p>
              이미 계정이 있으신가요?{' '}
              <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
                로그인
              </Link>
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
