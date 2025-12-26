import {
  PaintBrushIcon,
  ChartBarIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
  UsersIcon,
  CursorArrowRaysIcon,
  RectangleStackIcon,
  DevicePhoneMobileIcon,
  FunnelIcon,
  UserGroupIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  TagIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserPlusIcon,
  BellIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  ClockIcon,
} from '@heroicons/react/24/outline'

export type IconName =
  | 'PaintBrushIcon'
  | 'ChartBarIcon'
  | 'ChartPieIcon'
  | 'DocumentChartBarIcon'
  | 'CalendarDaysIcon'
  | 'UsersIcon'
  | 'CursorArrowRaysIcon'
  | 'RectangleStackIcon'
  | 'DevicePhoneMobileIcon'
  | 'FunnelIcon'
  | 'UserGroupIcon'
  | 'BoltIcon'
  | 'ArrowTrendingUpIcon'
  | 'TagIcon'
  | 'CalendarIcon'
  | 'CurrencyDollarIcon'
  | 'DocumentTextIcon'
  | 'UserPlusIcon'
  | 'BellIcon'
  | 'ArrowPathIcon'
  | 'ShieldCheckIcon'
  | 'ClockIcon'

export const iconMap: Record<IconName, React.ComponentType<{ className?: string }>> = {
  PaintBrushIcon,
  ChartBarIcon,
  ChartPieIcon,
  DocumentChartBarIcon,
  CalendarDaysIcon,
  UsersIcon,
  CursorArrowRaysIcon,
  RectangleStackIcon,
  DevicePhoneMobileIcon,
  FunnelIcon,
  UserGroupIcon,
  BoltIcon,
  ArrowTrendingUpIcon,
  TagIcon,
  CalendarIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  UserPlusIcon,
  BellIcon,
  ArrowPathIcon,
  ShieldCheckIcon,
  ClockIcon,
}

export function getIcon(iconName: IconName): React.ComponentType<{ className?: string }> {
  return iconMap[iconName]
}
