'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import UserHeader from './components/UserHeader'
import OverviewTab from './components/OverviewTab'
import ActivityTab from './components/ActivityTab'
import SettingsTab from './components/SettingsTab'
import type { UserDetail } from '@/types/admin'

export default function UserDetailPage() {
  const params = useParams()
  const userId = params.id as string

  const [user, setUser] = useState<UserDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  useEffect(() => {
    fetchUser()
  }, [userId])

  async function fetchUser() {
    try {
      setLoading(true)
      const response = await fetch(`/api/admin/users/${userId}`)
      if (!response.ok) throw new Error('Failed to fetch user')

      const data = await response.json()
      setUser(data.user)
      setError(null)
    } catch (err) {
      setError('사용자 정보를 불러오는데 실패했습니다')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleToggleStatus() {
    if (!user) return

    try {
      setIsUpdating(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !user.is_active }),
      })

      if (!response.ok) throw new Error('Failed to update user')

      await fetchUser()
    } catch (err) {
      console.error('Update error:', err)
      alert('사용자 상태 변경에 실패했습니다')
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleRoleChange(newRole: string) {
    if (!user) return

    try {
      setIsUpdating(true)
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      if (!response.ok) throw new Error('Failed to update user role')

      await fetchUser()
    } catch (err) {
      console.error('Update error:', err)
      alert('역할 변경에 실패했습니다')
    } finally {
      setIsUpdating(false)
    }
  }

  async function handleResetPassword() {
    if (!user) return
    if (!confirm(`${user.email}에게 비밀번호 재설정 이메일을 발송하시겠습니까?`)) return

    try {
      const response = await fetch(`/api/admin/users/${userId}/reset-password`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to send password reset email')

      alert('비밀번호 재설정 이메일이 발송되었습니다')
    } catch (err) {
      console.error('Reset password error:', err)
      alert('비밀번호 재설정 이메일 발송에 실패했습니다')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  if (error || !user) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-red-500">{error || '사용자를 찾을 수 없습니다'}</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <UserHeader
        user={user}
        onToggleStatus={handleToggleStatus}
        onResetPassword={handleResetPassword}
        isUpdating={isUpdating}
      />

      <Tabs defaultValue="overview" className="w-full">
        <TabsList>
          <TabsTrigger value="overview">개요</TabsTrigger>
          <TabsTrigger value="activity">활동</TabsTrigger>
          <TabsTrigger value="settings">설정</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <OverviewTab user={user} />
        </TabsContent>

        <TabsContent value="activity" className="mt-6">
          <ActivityTab userId={userId} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <SettingsTab
            user={user}
            onRoleChange={handleRoleChange}
            isUpdating={isUpdating}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}
