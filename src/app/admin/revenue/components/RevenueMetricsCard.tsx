'use client'

import { formatCurrency, formatPercentage } from '@/lib/revenue/calculations'
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid'

interface RevenueMetricsCardProps {
  title: string
  value: number
  growth: number
  subtitle?: string
}

export default function RevenueMetricsCard({
  title,
  value,
  growth,
  subtitle,
}: RevenueMetricsCardProps) {
  const isPositive = growth >= 0
  const formattedValue = formatCurrency(value)
  const formattedGrowth = formatPercentage(growth)

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-500">{title}</h3>
        <div
          className={`flex items-center gap-1 text-sm font-medium ${
            isPositive ? 'text-green-600' : 'text-red-600'
          }`}
        >
          {isPositive ? (
            <ArrowUpIcon className="w-4 h-4" />
          ) : (
            <ArrowDownIcon className="w-4 h-4" />
          )}
          <span>{formattedGrowth}</span>
        </div>
      </div>

      <div className="mt-2">
        <div className="text-3xl font-bold text-gray-900">{formattedValue}</div>
        {subtitle && <p className="mt-1 text-sm text-gray-500">{subtitle}</p>}
      </div>

      <div className="mt-4">
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full ${
              isPositive ? 'bg-green-500' : 'bg-red-500'
            }`}
            style={{
              width: `${Math.min(Math.abs(growth), 100)}%`,
            }}
          />
        </div>
      </div>
    </div>
  )
}
