'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/revenue/calculations'
import type { PlanBreakdown, BillingCycleBreakdown } from '@/types/revenue'

interface PlanBreakdownChartProps {
  planData: PlanBreakdown[]
  billingData: BillingCycleBreakdown[]
}

const PLAN_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']
const BILLING_COLORS = ['#3b82f6', '#10b981', '#f59e0b']

// 외부 라벨 렌더링 함수 - 텍스트 겹침 방지
const renderCustomLabel = ({
  cx,
  cy,
  midAngle,
  innerRadius,
  outerRadius,
  percent,
  name,
}: any) => {
  const RADIAN = Math.PI / 180
  // 라벨을 파이 바깥쪽으로 배치
  const radius = outerRadius + 30
  const x = cx + radius * Math.cos(-midAngle * RADIAN)
  const y = cy + radius * Math.sin(-midAngle * RADIAN)

  return (
    <text
      x={x}
      y={y}
      fill="#374151"
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      className="text-xs font-medium"
    >
      {`${name} (${(percent * 100).toFixed(1)}%)`}
    </text>
  )
}

export default function PlanBreakdownChart({
  planData,
  billingData,
}: PlanBreakdownChartProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Plan Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          플랜별 수익 분포
        </h3>

        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={planData.map((item) => ({
                ...item,
                name: item.plan_name,
              }))}
              dataKey="mrr"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderCustomLabel}
              labelLine={{
                stroke: '#9ca3af',
                strokeWidth: 1,
              }}
            >
              {planData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={PLAN_COLORS[index % PLAN_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.5rem',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {planData.map((plan, index) => (
            <div key={plan.plan_name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: PLAN_COLORS[index % PLAN_COLORS.length] }}
                />
                <span className="text-gray-700">{plan.plan_name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-gray-500">{plan.companies}개 회사</span>
                <span className="font-medium text-gray-900">
                  {formatCurrency(plan.mrr)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Billing Cycle Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          결제 주기별 수익 분포
        </h3>

        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={billingData.map((item) => ({
                ...item,
                name: item.cycle === 'monthly' ? '월간' : item.cycle === 'yearly' ? '연간' : '분기',
              }))}
              dataKey="mrr"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={renderCustomLabel}
              labelLine={{
                stroke: '#9ca3af',
                strokeWidth: 1,
              }}
            >
              {billingData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={BILLING_COLORS[index % BILLING_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number) => formatCurrency(value)}
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '0.5rem',
                padding: '0.5rem',
              }}
            />
          </PieChart>
        </ResponsiveContainer>

        <div className="mt-4 space-y-2">
          {billingData.map((billing, index) => {
            const cycleLabel =
              billing.cycle === 'monthly' ? '월간' : billing.cycle === 'yearly' ? '연간' : '분기'
            return (
              <div key={billing.cycle} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: BILLING_COLORS[index % BILLING_COLORS.length],
                    }}
                  />
                  <span className="text-gray-700">{cycleLabel}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-500">{billing.companies}개 회사</span>
                  <span className="font-medium text-gray-900">
                    {formatCurrency(billing.mrr)}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
