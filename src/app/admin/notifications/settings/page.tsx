'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Mail, Monitor, Save } from 'lucide-react'

interface NotificationSetting {
  id: string
  type: string
  channel: string
  enabled: boolean
}

const NOTIFICATION_TYPES = [
  {
    type: 'new_lead',
    label: '신규 리드',
    description: '새로운 리드가 생성되었을 때',
  },
  {
    type: 'status_change',
    label: '상태 변경',
    description: '리드의 상태가 변경되었을 때',
  },
  {
    type: 'goal_achieved',
    label: '목표 달성',
    description: '성과 목표를 달성했을 때',
  },
  {
    type: 'report_ready',
    label: '리포트 완료',
    description: '리포트 생성이 완료되었을 때',
  },
]

const CHANNELS = [
  {
    channel: 'email',
    label: '이메일',
    icon: Mail,
    description: '이메일로 알림을 받습니다',
  },
  {
    channel: 'in_app',
    label: '인앱 알림',
    icon: Bell,
    description: '웹 애플리케이션 내에서 알림을 받습니다',
  },
  {
    channel: 'web_push',
    label: '웹 푸시',
    icon: Monitor,
    description: '브라우저 푸시 알림을 받습니다',
  },
]

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<Record<string, Record<string, boolean>>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    try {
      setLoading(true)
      const response = await fetch('/api/admin/notifications/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')

      const result = await response.json()

      // 설정을 type-channel 구조로 변환
      const settingsMap: Record<string, Record<string, boolean>> = {}
      result.settings?.forEach((setting: NotificationSetting) => {
        if (!settingsMap[setting.type]) {
          settingsMap[setting.type] = {}
        }
        settingsMap[setting.type][setting.channel] = setting.enabled
      })

      setSettings(settingsMap)
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  async function handleSaveSettings() {
    try {
      setSaving(true)

      // 설정을 배열로 변환
      const settingsArray = Object.entries(settings).flatMap(([type, channels]) =>
        Object.entries(channels).map(([channel, enabled]) => ({
          type,
          channel,
          enabled,
        }))
      )

      const response = await fetch('/api/admin/notifications/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ settings: settingsArray }),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      alert('알림 설정이 저장되었습니다')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('설정 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  function toggleSetting(type: string, channel: string) {
    setSettings((prev) => ({
      ...prev,
      [type]: {
        ...prev[type],
        [channel]: !prev[type]?.[channel],
      },
    }))
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">알림 설정</h2>
          <p className="text-sm text-gray-500 mt-1">
            받고 싶은 알림의 종류와 채널을 설정합니다
          </p>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? '저장 중...' : '설정 저장'}
        </Button>
      </div>

      {/* 채널 설명 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {CHANNELS.map((channelInfo) => {
          const Icon = channelInfo.icon
          return (
            <Card key={channelInfo.channel}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Icon className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-medium text-gray-900">
                      {channelInfo.label}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {channelInfo.description}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* 알림 유형별 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>알림 유형별 채널 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {NOTIFICATION_TYPES.map((notifType) => (
              <div
                key={notifType.type}
                className="border-b border-gray-200 pb-6 last:border-b-0 last:pb-0"
              >
                <div className="mb-4">
                  <h3 className="font-medium text-gray-900">{notifType.label}</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    {notifType.description}
                  </p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {CHANNELS.map((channelInfo) => {
                    const Icon = channelInfo.icon
                    const isEnabled = settings[notifType.type]?.[channelInfo.channel] || false

                    return (
                      <button
                        key={channelInfo.channel}
                        onClick={() => toggleSetting(notifType.type, channelInfo.channel)}
                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-colors ${
                          isEnabled
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                      >
                        <div
                          className={`p-2 rounded-lg ${
                            isEnabled ? 'bg-blue-100' : 'bg-gray-100'
                          }`}
                        >
                          <Icon
                            className={`h-5 w-5 ${
                              isEnabled ? 'text-blue-600' : 'text-gray-600'
                            }`}
                          />
                        </div>
                        <div className="text-left flex-1">
                          <div
                            className={`font-medium ${
                              isEnabled ? 'text-blue-900' : 'text-gray-900'
                            }`}
                          >
                            {channelInfo.label}
                          </div>
                          <div
                            className={`text-xs ${
                              isEnabled ? 'text-blue-600' : 'text-gray-500'
                            }`}
                          >
                            {isEnabled ? '활성화됨' : '비활성화됨'}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 추가 설정 */}
      <Card>
        <CardHeader>
          <CardTitle>추가 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">알림 음소거</h3>
                <p className="text-sm text-gray-500 mt-1">
                  특정 시간대에 알림을 받지 않습니다
                </p>
              </div>
              <Button variant="outline" size="sm">
                설정
              </Button>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">알림 요약</h3>
                <p className="text-sm text-gray-500 mt-1">
                  여러 알림을 하나로 묶어서 받습니다
                </p>
              </div>
              <Button variant="outline" size="sm">
                설정
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
