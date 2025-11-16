export default function DashboardLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="mb-8">
        <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-1/4"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white overflow-hidden rounded-lg shadow">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="h-6 w-6 bg-gray-200 rounded"></div>
                </div>
                <div className="ml-5 w-full">
                  <div className="h-4 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-8 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 px-5 py-3">
              <div className="h-4 bg-gray-200 rounded w-24"></div>
            </div>
          </div>
        ))}
      </div>

      {/* Content Skeleton */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="h-6 bg-gray-200 rounded w-32 mb-4"></div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>
    </div>
  )
}
