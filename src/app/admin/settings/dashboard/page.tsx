'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LayoutDashboard,
  GripVertical,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
} from 'lucide-react'

interface Widget {
  id: string
  name: string
  description: string
  enabled: boolean
  order: number
}

// 위젯 id는 실제 /admin 대시보드(src/app/admin/page.tsx)의 STAT_CONFIG 키와
// 정확히 일치해야 한다 - 이전에는 이 목록이 conversion_chart/top_companies/
// utm_performance/goal_progress/notifications_summary처럼 실제 대시보드에
// 존재조차 하지 않는 위젯을 나열하고 있어(localStorage에만 저장, 대시보드는
// 전혀 참조 안 함) 설정을 저장해도 100% 아무 효과가 없는 placebo UI였다(53차
// QA 확인). 실제로 존재하는 8개 통계 카드 + 최신 현황 블록으로 맞춘다.
const DEFAULT_WIDGETS: Widget[] = [
  { id: 'leads', name: '유입', description: '이번달 유입 건수', enabled: true, order: 1 },
  { id: 'signups', name: '회원가입', description: '이번달 회원가입 건수', enabled: true, order: 2 },
  { id: 'trials', name: '무료체험', description: '이번달 무료체험 시작 건수', enabled: true, order: 3 },
  { id: 'payments', name: '결제', description: '이번달 결제 건수', enabled: true, order: 4 },
  { id: 'revenue', name: '매출', description: '이번달 매출', enabled: true, order: 5 },
  { id: 'withdrawals', name: '탈퇴', description: '이번달 탈퇴 건수', enabled: true, order: 6 },
  { id: 'cancellations', name: '구독취소', description: '이번달 구독취소 건수', enabled: true, order: 7 },
  { id: 'tickets', name: '문의', description: '이번달 문의 건수', enabled: true, order: 8 },
  { id: 'recent_activities', name: '최신 현황', description: '회원가입/결제/탈퇴/구독취소/문의 최근 내역 (전체 블록)', enabled: true, order: 9 },
]

export default function DashboardSettingsPage() {
  const [widgets, setWidgets] = useState<Widget[]>(DEFAULT_WIDGETS)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadSettings()
  }, [])

  async function loadSettings() {
    try {
      const saved = localStorage.getItem('dashboard_widgets')
      if (saved) {
        setWidgets(JSON.parse(saved))
      }
    } catch (error) {
      console.error('Error loading dashboard settings:', error)
    }
  }

  async function handleSaveSettings() {
    try {
      setSaving(true)
      localStorage.setItem('dashboard_widgets', JSON.stringify(widgets))
      alert('대시보드 설정이 저장되었습니다')
    } catch (error) {
      console.error('Error saving dashboard settings:', error)
      alert('설정 저장에 실패했습니다')
    } finally {
      setSaving(false)
    }
  }

  function handleResetSettings() {
    if (!confirm('대시보드 설정을 기본값으로 초기화하시겠습니까?')) return
    setWidgets(DEFAULT_WIDGETS)
    localStorage.removeItem('dashboard_widgets')
    alert('설정이 초기화되었습니다')
  }

  function toggleWidget(id: string) {
    setWidgets((prev) =>
      prev.map((w) => (w.id === id ? { ...w, enabled: !w.enabled } : w))
    )
  }

  function handleDragStart(index: number) {
    setDraggedIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return

    const newWidgets = [...widgets]
    const draggedWidget = newWidgets[draggedIndex]
    newWidgets.splice(draggedIndex, 1)
    newWidgets.splice(index, 0, draggedWidget)

    // Update order
    const updatedWidgets = newWidgets.map((w, i) => ({ ...w, order: i + 1 }))
    setWidgets(updatedWidgets)
    setDraggedIndex(index)
  }

  function handleDragEnd() {
    setDraggedIndex(null)
  }

  const enabledCount = widgets.filter((w) => w.enabled).length

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">대시보드 커스터마이징</h2>
          <p className="text-sm text-gray-500 mt-1">
            대시보드에 표시할 위젯을 선택하고 순서를 변경합니다
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleResetSettings}>
            <RotateCcw className="h-4 w-4 mr-2" />
            초기화
          </Button>
          <Button onClick={handleSaveSettings} disabled={saving}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? '저장 중...' : '설정 저장'}
          </Button>
        </div>
      </div>

      {/* 설정 정보 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <LayoutDashboard className="h-8 w-8 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">
                  활성화된 위젯: {enabledCount}개
                </p>
                <p className="text-sm text-gray-500">
                  총 {widgets.length}개의 위젯 중 {enabledCount}개가 대시보드에
                  표시됩니다
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 위젯 목록 */}
      <Card>
        <CardHeader>
          <CardTitle>위젯 설정</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 mb-4">
              드래그하여 순서를 변경하고, 눈 아이콘을 클릭하여 표시/숨김을 설정합니다
            </div>

            {widgets.map((widget, index) => (
              <div
                key={widget.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-3 p-4 border-2 rounded-lg transition-all cursor-move ${
                  widget.enabled
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-gray-200 bg-gray-50'
                } ${draggedIndex === index ? 'opacity-50' : ''}`}
              >
                <GripVertical className="h-5 w-5 text-gray-400" />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-500">
                      #{widget.order}
                    </span>
                    <h3 className="font-medium text-gray-900">{widget.name}</h3>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">
                    {widget.description}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleWidget(widget.id)}
                  className={widget.enabled ? 'text-blue-600' : 'text-gray-400'}
                >
                  {widget.enabled ? (
                    <>
                      <Eye className="h-4 w-4 mr-2" />
                      표시
                    </>
                  ) : (
                    <>
                      <EyeOff className="h-4 w-4 mr-2" />
                      숨김
                    </>
                  )}
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 미리보기 안내 */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-50 rounded-lg">
              <LayoutDashboard className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900">설정 적용</h3>
              <p className="text-sm text-gray-500 mt-1">
                설정을 저장한 후 대시보드 페이지로 이동하면 변경사항이 반영됩니다.
                <br />
                위젯 순서대로 표시되며, 비활성화된 위젯은 표시되지 않습니다.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
