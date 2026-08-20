'use client';

export default function SubjectsLoading() {
  return (
    <div className="space-y-6 animate-fade-in pb-24">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div>
          <div className="h-7 w-40 bg-gray-100 rounded-lg animate-pulse" />
          <div className="h-4 w-56 bg-gray-50 rounded animate-pulse mt-2" />
        </div>
        <div className="h-10 w-32 bg-violet-100 rounded-xl animate-pulse" />
      </div>

      {/* Search bar skeleton */}
      <div className="h-11 w-64 bg-gray-50 rounded-2xl animate-pulse" />

      {/* Cards grid skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-violet-50 rounded-xl animate-pulse" />
              <div className="flex-1 space-y-1.5">
                <div className="h-4 w-3/4 bg-gray-100 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-gray-50 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-2 bg-gray-50 rounded-full animate-pulse" />
            <div className="flex gap-4">
              <div className="h-3 w-16 bg-gray-50 rounded animate-pulse" />
              <div className="h-3 w-16 bg-gray-50 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
