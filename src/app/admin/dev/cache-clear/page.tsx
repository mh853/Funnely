'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function CacheClearPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  async function handleClearCache() {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/admin/cache/invalidate', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setMessage('✅ 캐시가 성공적으로 삭제되었습니다! 이제 이메일 템플릿 메뉴에 접근할 수 있습니다.')
      } else {
        setMessage(`❌ 캐시 삭제 실패: ${data.error}`)
      }
    } catch (error) {
      setMessage('❌ 오류가 발생했습니다. 대신 로그아웃 후 다시 로그인해주세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-6 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>권한 캐시 초기화</CardTitle>
          <CardDescription>
            데이터베이스에서 역할 권한을 수정한 후, 이 버튼을 눌러 캐시를 초기화하세요.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-medium">이 페이지를 사용하는 경우:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
              <li>admin_roles 테이블의 permissions 컬럼을 직접 수정한 경우</li>
              <li>SQL 마이그레이션으로 역할 권한을 추가/수정한 경우</li>
              <li>새로운 권한이 적용되지 않는 경우</li>
            </ul>
          </div>

          <Button
            onClick={handleClearCache}
            disabled={loading}
            className="w-full"
          >
            {loading ? '처리 중...' : '캐시 초기화'}
          </Button>

          {message && (
            <div className={`p-4 rounded-lg ${
              message.startsWith('✅')
                ? 'bg-green-50 text-green-800'
                : 'bg-red-50 text-red-800'
            }`}>
              {message}
            </div>
          )}

          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h3 className="font-medium mb-2">대안 방법:</h3>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>로그아웃 후 다시 로그인</li>
              <li>5분 대기 (캐시 자동 만료)</li>
              <li>개발 서버 재시작</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
