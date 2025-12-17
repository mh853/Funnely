import {
  ExclamationTriangleIcon,
  ExclamationCircleIcon,
  CheckCircleIcon,
  StarIcon,
} from '@heroicons/react/24/outline'

interface HealthStatusBadgeProps {
  status: 'critical' | 'at_risk' | 'healthy' | 'excellent'
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

const statusConfig = {
  critical: {
    label: '위험',
    icon: ExclamationTriangleIcon,
    className: 'bg-red-100 text-red-800 border-red-200',
  },
  at_risk: {
    label: '주의 필요',
    icon: ExclamationCircleIcon,
    className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  },
  healthy: {
    label: '건강',
    icon: CheckCircleIcon,
    className: 'bg-green-100 text-green-800 border-green-200',
  },
  excellent: {
    label: '우수',
    icon: StarIcon,
    className: 'bg-blue-100 text-blue-800 border-blue-200',
  },
}

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-3 py-1',
  lg: 'text-base px-4 py-1.5',
}

export function HealthStatusBadge({
  status,
  size = 'md',
  showIcon = true,
}: HealthStatusBadgeProps) {
  const config = statusConfig[status]
  const Icon = config.icon

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border font-medium ${config.className} ${sizeClasses[size]}`}
    >
      {showIcon && <Icon className="h-4 w-4" />}
      {config.label}
    </span>
  )
}
