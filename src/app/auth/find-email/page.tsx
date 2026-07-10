'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function FindEmailPage() {
  const [fullName, setFullName] = useState('')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [maskedEmails, setMaskedEmails] = useState<string[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setMaskedEmails(null)
    setLoading(true)

    try {
      const res = await fetch('/api/auth/find-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, phone: phone || null }),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || '조회에 실패했습니다.')
        return
      }

      setMaskedEmails(data.maskedEmails)
    } catch {
      setError('네트워크 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
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
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">아이디(이메일) 찾기</h1>
            <p className="text-gray-600 text-sm">
              가입 시 입력한 이름과 핸드폰 번호로 이메일 주소를 찾을 수 있습니다.
            </p>
          </div>

          {/* method="post": 하이드레이션 전 네이티브 제출 시 이름/전화번호가 URL에 노출되는 것을 방지 */}
          <form onSubmit={handleSubmit} method="post" className="space-y-5">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-2">
                이름
              </label>
              <input
                id="fullName"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="가입 시 입력한 이름"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-2">
                핸드폰 번호
              </label>
              <input
                id="phone"
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="010-0000-0000"
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
              {loading ? '조회 중...' : '이메일 찾기'}
            </button>
          </form>

          {maskedEmails !== null && (
            <div className="mt-6 p-4 bg-gray-50 rounded-xl">
              {maskedEmails.length === 0 ? (
                <p className="text-sm text-gray-600 text-center">
                  해당 이름으로 가입된 계정을 찾을 수 없습니다.
                </p>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-700">
                    가입된 이메일 {maskedEmails.length > 1 ? `(${maskedEmails.length}개)` : ''}
                  </p>
                  <ul className="space-y-2">
                    {maskedEmails.map((email, idx) => (
                      <li
                        key={idx}
                        className="flex items-center gap-2 text-sm text-gray-900 font-medium bg-white border border-gray-200 rounded-lg px-4 py-2.5"
                      >
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        {email}
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-gray-500 mt-2">
                    * 보안을 위해 이메일 일부를 가렸습니다.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 text-center space-y-2">
          <Link href="/auth/login" className="text-sm text-gray-500 hover:text-gray-700">
            ← 로그인으로 돌아가기
          </Link>
          <span className="text-gray-300 mx-2">|</span>
          <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
            비밀번호 찾기 →
          </Link>
        </div>
      </div>
    </div>
  )
}
