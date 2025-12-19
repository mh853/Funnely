'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, Clock, CreditCard, RefreshCw } from 'lucide-react'
import { format } from 'date-fns'
import { ko } from 'date-fns/locale'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface SubscriptionInfo {
  id: string
  status: string
  current_period_end: string
  grace_period_end: string | null
  plan: {
    name: string
    plan_type: 'individual' | 'business'
  }
}

export default function SubscriptionExpiredPage() {
  const router = useRouter()
  const [subscription, setSubscription] = useState<SubscriptionInfo | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSubscription()
  }, [])

  async function fetchSubscription() {
    try {
      const supabase = createClient()

      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) return

      const { data, error } = await supabase
        .from('company_subscriptions')
        .select(`
          id,
          status,
          current_period_end,
          grace_period_end,
          subscription_plans (
            name,
            plan_type
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (!error && data) {
        setSubscription({
          ...data,
          plan: data.subscription_plans as any,
        })
      }
    } catch (error) {
      console.error('Failed to fetch subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    )
  }

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end)
    : null
  const graceEnd = subscription?.grace_period_end
    ? new Date(subscription.grace_period_end)
    : null
  const now = new Date()

  const isInGracePeriod = graceEnd && graceEnd > now

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-2xl w-full">
        <CardHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-red-50 rounded-lg">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <div>
              <CardTitle className="text-2xl text-gray-900">
                {isInGracePeriod ? '구독 결제 지연' : '구독이 만료되었습니다'}
              </CardTitle>
              <p className="text-sm text-gray-500 mt-1">
                {isInGracePeriod
                  ? '결제 처리 중 문제가 발생했습니다'
                  : '서비스 이용을 계속하려면 플랜을 선택해주세요'}
              </p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 구독 정보 */}
          {subscription && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">플랜</span>
                <span className="font-medium text-gray-900">
                  {subscription.plan.name}{' '}
                  <span className="text-xs text-gray-500">
                    ({subscription.plan.plan_type === 'individual' ? '개인' : '기업'})
                  </span>
                </span>
              </div>

              {periodEnd && (
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">만료일</span>
                  <span className="font-medium text-gray-900">
                    {format(periodEnd, 'yyyy년 MM월 dd일', { locale: ko })}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">상태</span>
                <span
                  className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                    isInGracePeriod
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {isInGracePeriod ? '결제 지연' : '만료됨'}
                </span>
              </div>
            </div>
          )}

          {/* Grace Period 안내 */}
          {isInGracePeriod && graceEnd && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-orange-900 mb-1">
                    유예 기간 중입니다
                  </h3>
                  <p className="text-sm text-orange-700">
                    결제 처리가 완료되지 않았지만,{' '}
                    <strong>{format(graceEnd, 'MM월 dd일 HH:mm', { locale: ko })}</strong>
                    까지 서비스를 계속 이용하실 수 있습니다.
                  </p>
                  <p className="text-sm text-orange-700 mt-2">
                    결제 정보를 확인하시거나 새로운 플랜을 선택해주세요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 만료 안내 */}
          {!isInGracePeriod && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-red-900 mb-1">
                    대시보드 접근이 제한되었습니다
                  </h3>
                  <p className="text-sm text-red-700">
                    구독이 만료되어 대시보드의 기능을 사용하실 수 없습니다.
                  </p>
                  <p className="text-sm text-red-700 mt-2">
                    서비스를 계속 이용하시려면 아래에서 플랜을 선택해주세요.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* 액션 버튼 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1"
              size="lg"
              onClick={() => router.push('/dashboard/subscription')}
            >
              <CreditCard className="h-5 w-5 mr-2" />
              플랜 선택하기
            </Button>

            <Button
              variant="outline"
              size="lg"
              onClick={() => {
                fetchSubscription()
                setTimeout(() => {
                  router.push('/dashboard')
                }, 500)
              }}
            >
              <RefreshCw className="h-5 w-5 mr-2" />
              상태 새로고침
            </Button>
          </div>

          {/* 고객 지원 */}
          <div className="border-t pt-4">
            <p className="text-sm text-gray-600 text-center">
              문제가 계속되시나요?{' '}
              <a href="mailto:support@medisync.com" className="text-blue-600 hover:underline">
                고객 지원팀에 문의하기
              </a>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
