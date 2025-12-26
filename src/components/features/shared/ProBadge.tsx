import { LockClosedIcon } from '@heroicons/react/24/outline'

export default function ProBadge() {
  return (
    <div className="absolute -top-3 -right-3 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 px-3 py-1 shadow-lg">
      <LockClosedIcon className="h-3.5 w-3.5 text-white" />
      <span className="text-xs font-bold text-white">PRO</span>
    </div>
  )
}
