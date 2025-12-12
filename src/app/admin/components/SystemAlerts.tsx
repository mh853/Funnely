import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react'

interface Alert {
  type: 'urgent_ticket' | 'unpaid_subscription' | 'system_health'
  count?: number
  severity: 'low' | 'medium' | 'high'
  message: string
  action?: {
    label: string
    href: string
  }
}

interface SystemAlertsProps {
  alerts: Alert[]
}

const severityConfig = {
  high: {
    icon: AlertCircle,
    bgColor: 'bg-red-50',
    iconColor: 'text-red-500',
    borderColor: 'border-red-200',
  },
  medium: {
    icon: AlertTriangle,
    bgColor: 'bg-yellow-50',
    iconColor: 'text-yellow-500',
    borderColor: 'border-yellow-200',
  },
  low: {
    icon: CheckCircle2,
    bgColor: 'bg-green-50',
    iconColor: 'text-green-500',
    borderColor: 'border-green-200',
  },
}

export default function SystemAlerts({ alerts }: SystemAlertsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>시스템 알림</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {alerts.map((alert, index) => {
            const config = severityConfig[alert.severity]
            const Icon = config.icon

            return (
              <div
                key={index}
                className={`flex items-start gap-3 p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}
              >
                <Icon className={`w-5 h-5 mt-0.5 ${config.iconColor}`} />
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{alert.message}</p>
                  {alert.action && (
                    <Link href={alert.action.href}>
                      <Button variant="link" className="h-auto p-0 mt-1">
                        {alert.action.label} →
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            )
          })}

          {alerts.length === 0 && (
            <div className="flex items-center gap-3 p-4 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <p className="font-medium text-gray-900">
                ✅ 시스템 정상 작동 중
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
