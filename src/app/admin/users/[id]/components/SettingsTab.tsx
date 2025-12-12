'use client'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { UserDetail } from '@/types/admin'
import { getRoleLabel, ROLE_OPTIONS } from '@/lib/admin/role-utils'

interface SettingsTabProps {
  user: UserDetail
  onRoleChange: (role: string) => void
  isUpdating: boolean
}

export default function SettingsTab({ user, onRoleChange, isUpdating }: SettingsTabProps) {
  function handleRoleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const newRole = e.target.value
    if (newRole !== user.role) {
      if (confirm(`역할을 ${getRoleLabel(newRole as any)}로 변경하시겠습니까?`)) {
        onRoleChange(newRole)
      } else {
        e.target.value = user.role
      }
    }
  }

  return (
    <div className="space-y-6">
      {/* 역할 관리 */}
      <Card>
        <CardHeader>
          <CardTitle>역할 관리</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              사용자 역할
            </label>
            <select
              value={user.role}
              onChange={handleRoleChange}
              disabled={isUpdating}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {ROLE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-2">
              역할에 따라 시스템 내에서 수행할 수 있는 작업이 달라집니다.
            </p>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <h4 className="text-sm font-medium text-gray-900 mb-3">역할별 권한</h4>
            <div className="space-y-2 text-sm text-gray-600">
              {ROLE_OPTIONS.map((option) => (
                <div key={option.value}>
                  <span className="font-medium">{option.label}:</span> {option.description}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 계정 상태 */}
      <Card>
        <CardHeader>
          <CardTitle>계정 상태</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">활성 상태</p>
              <p className="text-xs text-gray-500 mt-1">
                비활성화하면 사용자가 로그인할 수 없습니다
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {user.is_active ? '활성' : '비활성'}
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-medium text-gray-900">소속 회사 상태</p>
              <p className="text-xs text-gray-500 mt-1">
                {user.company.name}
              </p>
            </div>
            <div
              className={`px-3 py-1 rounded-full text-sm font-medium ${
                user.company.is_active
                  ? 'bg-green-100 text-green-700'
                  : 'bg-red-100 text-red-700'
              }`}
            >
              {user.company.is_active ? '활성' : '비활성'}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 위험한 작업 */}
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="text-red-600">위험한 작업</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              사용자 계정을 삭제하면 모든 데이터가 영구적으로 삭제됩니다. 이 작업은
              되돌릴 수 없습니다.
            </p>
            <Button variant="destructive" disabled>
              사용자 삭제 (구현 예정)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
