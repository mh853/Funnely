import { LucideIcon, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StatsCardProps {
  title: string
  value: number | string
  change?: {
    value: number
    trend: 'up' | 'down'
  }
  icon: LucideIcon
  description?: string
}

export default function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  description,
}: StatsCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {change && (
          <div className="flex items-center gap-1 mt-2">
            {change.trend === 'up' ? (
              <TrendingUp className="h-4 w-4 text-green-500" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500" />
            )}
            <span
              className={`text-xs font-medium ${
                change.trend === 'up' ? 'text-green-500' : 'text-red-500'
              }`}
            >
              {change.trend === 'up' ? '+' : '-'}
              {Math.abs(change.value)}
            </span>
            <span className="text-xs text-muted-foreground">vs 지난달</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
