import { IconName, getIcon } from '@/utils/iconMap'

interface FeatureIconProps {
  Icon: IconName
  gradient: string
  size?: 'sm' | 'md' | 'lg'
}

export default function FeatureIcon({ Icon, gradient, size = 'md' }: FeatureIconProps) {
  const IconComponent = getIcon(Icon)
  const sizeClasses = {
    sm: 'p-2',
    md: 'p-3',
    lg: 'p-4',
  }

  const iconSizes = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  }

  return (
    <div className={`inline-flex rounded-xl bg-gradient-to-r ${gradient} ${sizeClasses[size]} shadow-lg`}>
      <IconComponent className={`${iconSizes[size]} text-white`} aria-hidden="true" />
    </div>
  )
}
