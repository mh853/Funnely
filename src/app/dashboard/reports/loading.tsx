export default function ReportsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div>
        <div className="h-8 bg-gray-200 rounded w-32 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-64"></div>
      </div>

      {/* Report Generator Skeleton */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-12 bg-gray-100 rounded"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>

      {/* Recent Reports Skeleton */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-48 mb-4"></div>
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <div className="h-5 bg-gray-200 rounded w-64 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
