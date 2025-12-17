'use client'

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { formatCurrency } from '@/lib/revenue/calculations'
import type { PlanBreakdown, BillingCycleBreakdown } from '@/types/revenue'

interface PlanBreakdownChartProps {
  planData: PlanBreakdown[]
  billingData: BillingCycleBreakdown[]
}

const PLAN_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
const BILLING_COLORS = ['#3b82f6', '#10b981', '#f59e0b']

export default function PlanBreakdownChart({
  planData,
  billingData,
}: PlanBreakdownChartProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Plan Breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          플랜별 수익 분포
        </h3>

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={planData}
              dataKey="mrr"
              nameKey="plan_name"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ plan_name, percentage }) =>
                `${plan_name} (${percentage.toFixed(1)}%)`
              }
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
            />
            <Legend />
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

        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              data={billingData}
              dataKey="mrr"
              nameKey="cycle"
              cx="50%"
              cy="50%"
              outerRadius={80}
              label={({ cycle, percentage }) => {
                const cycleLabel = cycle === 'monthly' ? '월간' : cycle === 'yearly' ? '연간' : '분기'
                return `${cycleLabel} (${percentage.toFixed(1)}%)`
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
            />
            <Legend
              formatter={(value) => {
                if (value === 'monthly') return '월간'
                if (value === 'yearly') return '연간'
                if (value === 'quarterly') return '분기'
                return value
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
