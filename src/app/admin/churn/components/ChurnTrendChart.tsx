'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { ChurnTrend } from '@/types/churn'

interface ChurnTrendChartProps {
  data: ChurnTrend[]
}

export default function ChurnTrendChart({ data }: ChurnTrendChartProps) {
  // Format month for display (YYYY-MM -> MM월)
  const formattedData = data.map((item) => ({
    ...item,
    month: item.period.split('-')[1] + '월',
  }))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        이탈률 추이 (최근 12개월)
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis
            yAxisId="left"
            tickFormatter={(value) => `${value.toFixed(1)}%`}
          />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'churn_rate') return [`${value.toFixed(2)}%`, '이탈률']
              if (name === 'churned_count')
                return [`${value}개`, '이탈 회사 수']
              return value
            }}
            labelStyle={{ color: '#000' }}
          />
          <Legend
            formatter={(value) => {
              if (value === 'churn_rate') return '이탈률'
              if (value === 'churned_count') return '이탈 회사 수'
              return value
            }}
          />
          <Line
            yAxisId="left"
            type="monotone"
            dataKey="churn_rate"
            name="churn_rate"
            stroke="#ef4444"
            strokeWidth={2}
            dot={{ fill: '#ef4444', r: 4 }}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="churned_count"
            name="churned_count"
            stroke="#f59e0b"
            strokeWidth={2}
            dot={{ fill: '#f59e0b', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
