'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()

    // Supabase Realtime 구독
    const supabase = createClient()

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          console.log('🔔 Realtime notification change:', payload)
          console.log('  - Event type:', payload.eventType)
          console.log('  - Old is_read:', (payload.old as any)?.is_read)
          console.log('  - New is_read:', (payload.new as any)?.is_read)

          // 알림 변경 시 즉시 카운트 업데이트
          // 50ms 지연으로 DB 일관성 보장
          setTimeout(() => {
            fetchUnreadCount()
          }, 50)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchUnreadCount() {
    try {
      const response = await fetch('/api/admin/notifications?unread_only=true&limit=1')
      if (!response.ok) return

      const data = await response.json()
      setUnreadCount(data.unreadCount || 0)
    } catch (error) {
      console.error('Error fetching unread count:', error)
    }
  }

  return (
    <Link href="/admin/notifications">
      <Button variant="ghost" size="sm" className="relative">
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </Button>
    </Link>
  )
}
