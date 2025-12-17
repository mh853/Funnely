'use client'

import { formatCurrency } from '@/lib/revenue/calculations'

interface ChurnMetricsCardProps {
  title: string
  value: number
  unit: string
  description?: string
  isCurrency?: boolean
}

export default function ChurnMetricsCard({
  title,
  value,
  unit,
  description,
  isCurrency = false,
}: ChurnMetricsCardProps) {
  const formattedValue = isCurrency
    ? formatCurrency(value)
    : value.toLocaleString('ko-KR', { maximumFractionDigits: 2 })

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>

      <div className="mt-2">
        <div className="text-3xl font-bold text-gray-900">
          {formattedValue}
          {!isCurrency && (
            <span className="text-lg font-normal text-gray-500 ml-1">
              {unit}
            </span>
          )}
        </div>

        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
      </div>
    </div>
  )
}
