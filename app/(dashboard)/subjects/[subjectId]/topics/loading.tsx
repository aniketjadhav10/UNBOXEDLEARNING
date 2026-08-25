'use client';

export default function TopicsLoading() {
  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Back button skeleton */}
      <div className="h-5 w-20 bg-gray-100 rounded animate-pulse" />

      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-48 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-32 bg-gray-50 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-28 bg-violet-100 rounded-xl animate-pulse" />
      </div>

      {/* Search bar skeleton */}
      <div className="h-11 w-64 bg-gray-50 rounded-2xl animate-pulse" />

      {/* Topic cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-indigo-50 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-full bg-gray-50 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-2 bg-gray-50 rounded-full animate-pulse" />
            <div className="flex gap-3">
              <div className="h-6 w-20 bg-violet-50 rounded-lg animate-pulse" />
              <div className="h-6 w-16 bg-gray-50 rounded-lg animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
