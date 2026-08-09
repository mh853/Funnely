'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircleIcon, XCircleIcon, ClockIcon } from '@heroicons/react/24/outline'
import { createClient } from '@/lib/supabase/client'

interface InviteAcceptClientProps {
  code: string
}

interface InvitationInfo {
  id: string
  role: 'admin' | 'manager' | 'user'
  expiresAt: string
  companyName: string
}

const roleLabels: Record<string, string> = {
  admin: '관리자',
  manager: '매니저',
  user: '일반 사용자',
}

export default function InviteAcceptClient({ code }: InviteAcceptClientProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [invitation, setInvitation] = useState<InvitationInfo | null>(null)
  const [invalidStatus, setInvalidStatus] = useState<string | null>(null)
  // 초대가 실제로 무효(만료/취소/이미 수락)한 것이 아니라, 조회 자체가 실패한
  // 경우(네트워크 오류, 예상치 못한 5xx 등)를 구분하기 위한 플래그.
  // invalidStatus와 달리 재시도가 의미 있는 상황이다.
  const [checkFailed, setCheckFailed] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    fullName: '',
  })

  useEffect(() => {
    fetchInvitationInfo()
  }, [code])

  const fetchInvitationInfo = async () => {
    setLoading(true)
    setCheckFailed(false)
    setError(null)

    try {
      const response = await fetch(`/api/users/invite/accept?code=${code}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || '초대 정보를 불러오는데 실패했습니다.')
        // 404는 "이 코드는 존재하지 않는다"는 API의 명확한 판정이라 재시도가 무의미하다
        // (기존 동작 유지). 반면 5xx는 서버 쪽 문제일 뿐 초대 코드 자체가 무효하다는
        // 뜻이 아니므로 "확인 중 문제 발생"으로 구분해 재시도를 제공한다.
        if (response.status >= 500) {
          setCheckFailed(true)
        }
        return
      }

      if (!data.valid) {
        setInvalidStatus(data.status)
        setError(data.message)
        return
      }

      setInvitation(data.invitation)
    } catch (err) {
      setError('초대 정보를 확인하는 중 문제가 발생했습니다.')
      setCheckFailed(true)
    } finally {
      setLoading(false)
    }
  }

  // 초대 수락으로 새 계정을 만들어도 service-role admin API로만 생성되므로
  // 브라우저 세션은 바뀌지 않는다. 이미 다른 계정으로 로그인되어 있던 상태라면
  // /auth/login으로 이동해도 미들웨어가 "이미 로그인된 사용자"로 보고 기존 계정의
  // 대시보드로 되돌려보내 버린다 - 새로 만든 계정으로 로그인할 기회조차 없이.
  // 이동 전에 기존 세션을 명시적으로 지워야 새 계정 로그인 폼이 실제로 보인다.
  const signOutAndGoToLogin = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError('비밀번호가 일치하지 않습니다.')
      setSubmitting(false)
      return
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('비밀번호는 8자 이상이어야 합니다.')
      setSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/users/invite/accept', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          code,
          email: formData.email,
          password: formData.password,
          fullName: formData.fullName,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || '가입에 실패했습니다.')
      }

      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        signOutAndGoToLogin()
      }, 3000)
    } catch (err: any) {
      setError(err.message || '가입에 실패했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="text-center py-8">
        <CheckCircleIcon className="mx-auto h-12 w-12 text-green-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">가입이 완료되었습니다!</h3>
        <p className="mt-2 text-sm text-gray-500">
          잠시 후 로그인 페이지로 이동합니다...
        </p>
        <button
          onClick={signOutAndGoToLogin}
          className="mt-4 text-sm text-blue-600 hover:text-blue-500"
        >
          바로 로그인하기
        </button>
      </div>
    )
  }

  // Invalid invitation state
  if (invalidStatus) {
    const icons: Record<string, React.ReactNode> = {
      expired: <ClockIcon className="mx-auto h-12 w-12 text-yellow-500" />,
      accepted: <CheckCircleIcon className="mx-auto h-12 w-12 text-gray-400" />,
      cancelled: <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />,
    }

    return (
      <div className="text-center py-8">
        {icons[invalidStatus] || <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />}
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          {invalidStatus === 'expired'
            ? '초대가 만료되었습니다'
            : invalidStatus === 'accepted'
              ? '이미 수락된 초대입니다'
              : '유효하지 않은 초대입니다'}
        </h3>
        <p className="mt-2 text-sm text-gray-500">{error}</p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-500"
        >
          홈으로 돌아가기
        </button>
      </div>
    )
  }

  // Check failed state (network/server error while looking up the invitation -
  // distinct from an actually invalid/expired/accepted/cancelled invitation)
  if (checkFailed) {
    return (
      <div className="text-center py-8">
        <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">
          초대 정보를 확인하는 중 문제가 발생했습니다
        </h3>
        <p className="mt-2 text-sm text-gray-500">
          네트워크 연결을 확인하고 다시 시도해주세요.
        </p>
        <div className="mt-4 flex justify-center gap-4">
          <button
            onClick={() => fetchInvitationInfo()}
            className="text-sm text-blue-600 hover:text-blue-500"
          >
            다시 시도
          </button>
          <button
            onClick={() => router.push('/')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    )
  }

  // Error state (no invitation found)
  if (!invitation) {
    return (
      <div className="text-center py-8">
        <XCircleIcon className="mx-auto h-12 w-12 text-red-500" />
        <h3 className="mt-4 text-lg font-medium text-gray-900">유효하지 않은 초대 링크</h3>
        <p className="mt-2 text-sm text-gray-500">
          {error || '초대 링크가 올바르지 않습니다.'}
        </p>
        <button
          onClick={() => router.push('/')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-500"
        >
          홈으로 돌아가기
        </button>
      </div>
    )
  }

  // Valid invitation - show signup form
  return (
    <div>
      {/* Invitation Info */}
      <div className="mb-6 p-4 bg-blue-50 rounded-lg">
        <h3 className="text-sm font-medium text-blue-800">초대 정보</h3>
        <div className="mt-2 text-sm text-blue-700">
          <p>
            <span className="font-medium">{invitation.companyName}</span> 팀에 초대되었습니다.
          </p>
          <p className="mt-1">
            권한: <span className="font-medium">{roleLabels[invitation.role]}</span>
          </p>
        </div>
      </div>

      {/* Signup Form */}
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="fullName"
            id="fullName"
            required
            value={formData.fullName}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="홍길동"
          />
        </div>

        {/* Email */}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            이메일 <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            id="email"
            required
            value={formData.email}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="user@example.com"
          />
        </div>

        {/* Password */}
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            비밀번호 <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="password"
            id="password"
            required
            minLength={8}
            value={formData.password}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="8자 이상"
          />
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
            비밀번호 확인 <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="confirmPassword"
            id="confirmPassword"
            required
            minLength={8}
            value={formData.confirmPassword}
            onChange={handleChange}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
            placeholder="비밀번호를 다시 입력하세요"
          />
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={submitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          {submitting ? '처리 중...' : '가입하기'}
        </button>
      </form>

      {/* Login Link */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          이미 계정이 있으신가요?{' '}
          <button
            type="button"
            onClick={signOutAndGoToLogin}
            className="font-medium text-blue-600 hover:text-blue-500"
          >
            로그인
          </button>
        </p>
      </div>
    </div>
  )
}
