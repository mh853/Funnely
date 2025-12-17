'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/revenue/calculations'
import type { ChurnReasonBreakdown } from '@/types/churn'

interface ChurnReasonChartProps {
  reasons: ChurnReasonBreakdown[]
}

const COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6']

const CATEGORY_LABELS: Record<string, string> = {
  pricing: '가격',
  features: '기능',
  support: '지원',
  competition: '경쟁사',
  other: '기타',
  unknown: '미분류',
}

export default function ChurnReasonChart({ reasons }: ChurnReasonChartProps) {
  if (reasons.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          이탈 사유 분포
        </h3>
        <p className="text-gray-500 text-center py-12">
          이탈 데이터가 없습니다
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        이탈 사유 분포
      </h3>

      <ResponsiveContainer width="100%" height={300}>
        <PieChart>
          <Pie
            data={reasons}
            dataKey="count"
            nameKey="category"
            cx="50%"
            cy="50%"
            outerRadius={80}
            label={({ category, percentage }) => {
              const label = CATEGORY_LABELS[category] || category
              return `${label} (${percentage.toFixed(1)}%)`
            }}
          >
            {reasons.map((entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={COLORS[index % COLORS.length]}
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number) => [`${value}개`, '이탈 회사']}
          />
          <Legend
            formatter={(value) => CATEGORY_LABELS[value] || value}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="mt-4 space-y-2">
        {reasons.map((reason, index) => (
          <div
            key={reason.category}
            className="flex items-center justify-between text-sm"
          >
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              <span className="text-gray-700">
                {CATEGORY_LABELS[reason.category] || reason.category}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-gray-500">{reason.count}개 회사</span>
              <span className="font-medium text-gray-900">
                {formatCurrency(reason.lost_mrr)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
