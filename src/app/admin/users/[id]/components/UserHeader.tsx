'use client'

import Link from 'next/link'
import { ArrowLeft, Key, Power } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import type { UserDetail } from '@/types/admin'

interface UserHeaderProps {
  user: UserDetail
  onToggleStatus: () => void
  onResetPassword: () => void
  isUpdating: boolean
}

function getRoleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: '관리자',
    manager: '매니저',
    staff: '스태프',
    viewer: '뷰어',
  }
  return labels[role] || role
}

export default function UserHeader({
  user,
  onToggleStatus,
  onResetPassword,
  isUpdating,
}: UserHeaderProps) {
  return (
    <div className="bg-white border-b border-gray-200">
      <div className="px-8 py-6">
        {/* 뒤로 가기 */}
        <Link
          href="/admin/users"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          목록으로
        </Link>

        {/* 사용자 정보 */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{user.full_name}</h1>
              <Badge variant={user.is_active ? 'default' : 'secondary'}>
                {user.is_active ? '활성' : '비활성'}
              </Badge>
              <span className="inline-block px-2 py-1 text-xs font-medium rounded bg-blue-100 text-blue-700">
                {getRoleLabel(user.role)}
              </span>
            </div>
            <div className="mt-2 space-y-1">
              <p className="text-sm text-gray-500">이메일: {user.email}</p>
              {user.phone && (
                <p className="text-sm text-gray-500">전화번호: {user.phone}</p>
              )}
              <p className="text-sm text-gray-500">
                소속: {user.company.name}
              </p>
              <p className="text-sm text-gray-500">
                가입일: {format(new Date(user.created_at), 'yyyy년 MM월 dd일', { locale: ko })}
              </p>
              {user.last_login_at && (
                <p className="text-sm text-gray-500">
                  마지막 로그인: {format(new Date(user.last_login_at), 'yyyy-MM-dd HH:mm', { locale: ko })}
                </p>
              )}
            </div>
          </div>

          {/* 액션 버튼 */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onResetPassword}
              disabled={isUpdating}
            >
              <Key className="h-4 w-4 mr-2" />
              비밀번호 재설정
            </Button>
            <Button
              variant={user.is_active ? 'destructive' : 'default'}
              onClick={onToggleStatus}
              disabled={isUpdating}
            >
              <Power className="h-4 w-4 mr-2" />
              {isUpdating
                ? '처리 중...'
                : user.is_active
                ? '비활성화'
                : '활성화'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
