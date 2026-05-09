'use client'

import { useState } from 'react'
import Link from 'next/link'

export default function FindEmailPage() {
  const [fullName, setFullName] = useState('')
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
        body: JSON.stringify({ fullName }),
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">아이디(이메일) 찾기</h1>
            <p className="text-gray-600 text-sm">
              가입 시 입력한 이름으로 이메일 주소를 찾을 수 있습니다.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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

            {error && (
              <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:bg-blue-300 disabled:cursor-not-allowed"
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
          <div>
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-900">
              ← 로그인으로 돌아가기
            </Link>
          </div>
          <div>
            <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:text-blue-700">
              비밀번호 찾기 →
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
