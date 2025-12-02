export default function LandingPageFormSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Basic Info Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="space-y-3">
          <div className="h-10 bg-gray-100 rounded"></div>
          <div className="h-10 bg-gray-100 rounded"></div>
          <div className="h-32 bg-gray-100 rounded"></div>
        </div>
      </div>

      {/* Image Section */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="grid grid-cols-3 gap-4">
          <div className="aspect-video bg-gray-100 rounded"></div>
          <div className="aspect-video bg-gray-100 rounded"></div>
          <div className="aspect-video bg-gray-100 rounded"></div>
        </div>
      </div>

      {/* Collection Settings */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/3"></div>
        <div className="space-y-3">
          <div className="h-8 bg-gray-100 rounded"></div>
          <div className="h-8 bg-gray-100 rounded"></div>
          <div className="h-8 bg-gray-100 rounded"></div>
        </div>
      </div>

      {/* Section Toggles */}
      <div className="bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="h-6 bg-gray-200 rounded w-1/4"></div>
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4">
        <div className="h-12 bg-gray-200 rounded flex-1"></div>
        <div className="h-12 bg-indigo-200 rounded flex-1"></div>
      </div>
    </div>
  )
}
