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

    // 1. Polling: 10초마다 카운트 새로고침 (백업 메커니즘)
    const pollingInterval = setInterval(() => {
      fetchUnreadCount()
    }, 10000) // 10초

    // 2. Supabase Realtime 구독 (메인 메커니즘)
    const supabase = createClient()

    const channel = supabase
      .channel('notifications-bell')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          // Realtime 이벤트 발생 시 즉시 카운트 업데이트
          fetchUnreadCount()
        }
      )
      .subscribe((status) => {
        if (status === 'CHANNEL_ERROR') {
          console.error('[NotificationBell] Realtime subscription error')
        } else if (status === 'TIMED_OUT') {
          console.error('[NotificationBell] Realtime subscription timed out')
        }
      })

    return () => {
      clearInterval(pollingInterval)
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
