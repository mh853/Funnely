export default function CampaignsLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-8 bg-gray-200 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-64"></div>
        </div>
        <div className="flex gap-3">
          <div className="h-10 bg-gray-200 rounded w-24"></div>
          <div className="h-10 bg-gray-200 rounded w-32"></div>
        </div>
      </div>

      {/* Campaigns List Skeleton */}
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4 flex-1">
                <div className="h-12 w-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-6 bg-gray-200 rounded w-48 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-32"></div>
                </div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => (
                <div key={j}>
                  <div className="h-4 bg-gray-200 rounded w-16 mb-1"></div>
                  <div className="h-6 bg-gray-200 rounded w-24"></div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
