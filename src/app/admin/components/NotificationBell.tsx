'use client'

import { useEffect, useState, useRef } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/client'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)
  const lastSyncTime = useRef<number>(0)

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

          // ✅ Realtime 이벤트로 즉시 카운트 계산
          if (payload.eventType === 'UPDATE') {
            const oldRead = (payload.old as any)?.is_read
            const newRead = (payload.new as any)?.is_read

            console.log('  - Old is_read:', oldRead)
            console.log('  - New is_read:', newRead)

            if (oldRead === false && newRead === true) {
              // 읽음 처리 → 카운트 감소
              setUnreadCount((prev) => {
                const newCount = Math.max(0, prev - 1)
                console.log(`  → Unread count decreased: ${prev} → ${newCount}`)
                return newCount
              })
            } else if (oldRead === true && newRead === false) {
              // 읽지 않음으로 변경 → 카운트 증가
              setUnreadCount((prev) => {
                const newCount = prev + 1
                console.log(`  → Unread count increased: ${prev} → ${newCount}`)
                return newCount
              })
            }
          } else if (payload.eventType === 'INSERT') {
            const isRead = (payload.new as any)?.is_read
            console.log('  - New notification is_read:', isRead)

            if (isRead === false) {
              // 새 읽지 않은 알림 → 카운트 증가
              setUnreadCount((prev) => {
                const newCount = prev + 1
                console.log(`  → New unread notification: ${prev} → ${newCount}`)
                return newCount
              })
            }
          } else if (payload.eventType === 'DELETE') {
            const wasUnread = (payload.old as any)?.is_read === false
            console.log('  - Deleted notification was_unread:', wasUnread)

            if (wasUnread) {
              // 읽지 않은 알림 삭제 → 카운트 감소
              setUnreadCount((prev) => {
                const newCount = Math.max(0, prev - 1)
                console.log(`  → Unread notification deleted: ${prev} → ${newCount}`)
                return newCount
              })
            }
          }

          // 5분마다 한 번씩 서버와 동기화 (정확성 보장)
          const now = Date.now()
          if (now - lastSyncTime.current > 300000) {
            console.log('  → Syncing with server (5min periodic check)')
            fetchUnreadCount()
            lastSyncTime.current = now
          }
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
      lastSyncTime.current = Date.now()
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
