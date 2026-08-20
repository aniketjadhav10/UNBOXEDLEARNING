'use client';

export default function TasksLoading() {
  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Back button skeleton */}
      <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />

      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-56 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-28 bg-gray-50 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-24 bg-violet-100 rounded-xl animate-pulse" />
      </div>

      {/* Search bar skeleton */}
      <div className="h-11 w-64 bg-gray-50 rounded-2xl animate-pulse" />

      {/* Task cards skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-4">
            {/* Task header */}
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-50 rounded animate-pulse" />
              </div>
              <div className="w-8 h-8 bg-gray-50 rounded-lg animate-pulse ml-3" />
            </div>
            {/* Stage badge */}
            <div className="flex gap-2">
              <div className="h-6 w-24 bg-violet-50 rounded-full animate-pulse" />
              <div className="h-6 w-20 bg-gray-50 rounded-full animate-pulse" />
            </div>
            {/* Action buttons */}
            <div className="flex gap-2 pt-2 border-t border-gray-50">
              <div className="h-8 flex-1 bg-gray-50 rounded-lg animate-pulse" />
              <div className="h-8 flex-1 bg-gray-50 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
