import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { TrendingUp, TrendingDown } from 'lucide-react'

interface SimpleStatsCardProps {
  title: string
  value: number | string
  subtitle?: string
  trend?: string
  trendUp?: boolean
}

export default function SimpleStatsCard({
  title,
  value,
  subtitle,
  trend,
  trendUp,
}: SimpleStatsCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium text-gray-500">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-gray-900">
          {typeof value === 'number' ? value.toLocaleString() : value}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-600 mt-1">{subtitle}</p>
        )}
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            {trendUp ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-gray-400" />
            )}
            <span
              className={`text-sm font-medium ${
                trendUp ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              {trend}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
