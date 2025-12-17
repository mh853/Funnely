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
import { formatCurrency } from '@/lib/revenue/calculations'
import type { RevenueTrend } from '@/types/revenue'

interface RevenueTrendChartProps {
  data: RevenueTrend[]
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  // Format month for display (YYYY-MM -> MM월)
  const formattedData = data.map((item) => ({
    ...item,
    month: item.month.split('-')[1] + '월',
  }))

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        수익 추이 (최근 6개월)
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="month" />
          <YAxis
            tickFormatter={(value) =>
              `${(value / 1000000).toFixed(0)}M`
            }
          />
          <Tooltip
            formatter={(value: number) => formatCurrency(value)}
            labelStyle={{ color: '#000' }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="mrr"
            name="MRR"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: '#3b82f6', r: 4 }}
          />
          <Line
            type="monotone"
            dataKey="arr"
            name="ARR"
            stroke="#10b981"
            strokeWidth={2}
            dot={{ fill: '#10b981', r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
