import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatDistanceToNow } from 'date-fns'
import { ko } from 'date-fns/locale'
import {
  UserPlus,
  FileText,
  Globe,
  LogIn,
  MessageSquare,
  CreditCard,
} from 'lucide-react'

interface Activity {
  id: string
  companyName: string
  activityType: string
  description: string
  createdAt: string
}

interface ActivityFeedProps {
  activities: Activity[]
  maxItems?: number
}

const activityIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  login: LogIn,
  user_invited: UserPlus,
  lead_created: FileText,
  landing_page_published: Globe,
  support_ticket_created: MessageSquare,
  payment_succeeded: CreditCard,
}

const activityLabels: Record<string, string> = {
  login: '로그인',
  user_invited: '사용자 초대',
  lead_created: '리드 생성',
  landing_page_published: '랜딩페이지 발행',
  support_ticket_created: '문의 생성',
  payment_succeeded: '결제 완료',
}

export default function ActivityFeed({
  activities,
  maxItems = 10,
}: ActivityFeedProps) {
  const displayActivities = activities.slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle>최근 활동</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {displayActivities.map((activity) => {
            const Icon =
              activityIcons[activity.activityType] || FileText
            const label =
              activityLabels[activity.activityType] || activity.activityType

            return (
              <div
                key={activity.id}
                className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-0 last:pb-0"
              >
                <div className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">
                    {activity.companyName}
                  </p>
                  <p className="text-sm text-gray-600 mt-0.5">
                    {activity.description || label}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatDistanceToNow(new Date(activity.createdAt), {
                      addSuffix: true,
                      locale: ko,
                    })}
                  </p>
                </div>
              </div>
            )
          })}

          {displayActivities.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-8">
              최근 활동이 없습니다
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
