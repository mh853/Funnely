'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchUnreadCount()

    // 30초마다 업데이트
    const interval = setInterval(fetchUnreadCount, 30000)
    return () => clearInterval(interval)
  }, [])

  async function fetchUnreadCount() {
    try {
      const response = await fetch('/admin/api/notifications?unread_only=true&limit=1')
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
