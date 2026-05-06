// Loading skeleton placeholder cards
interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps = {}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-card animate-pulse ${className ?? ''}`}>
      {/* Icon placeholder */}
      <div className="w-12 h-12 bg-gray-200 rounded-xl mb-4" />
      {/* Title */}
      <div className="h-4 bg-gray-200 rounded-full w-3/4 mb-2" />
      {/* Description lines */}
      <div className="h-3 bg-gray-100 rounded-full w-full mb-1.5" />
      <div className="h-3 bg-gray-100 rounded-full w-5/6 mb-4" />
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 rounded-full w-full mb-1" />
      <div className="flex justify-between">
        <div className="h-3 bg-gray-100 rounded-full w-1/4" />
        <div className="h-3 bg-gray-100 rounded-full w-1/5" />
      </div>
    </div>
  );
}

interface SkeletonRowProps {
  className?: string;
}

export function SkeletonRow({ className }: SkeletonRowProps = {}) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-card animate-pulse flex gap-4 items-start ${className ?? ''}`}>
      <div className="w-10 h-10 bg-gray-200 rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 bg-gray-200 rounded-full w-2/3" />
        <div className="h-3 bg-gray-100 rounded-full w-full" />
        <div className="h-3 bg-gray-100 rounded-full w-4/5" />
      </div>
    </div>
  );
}

interface SkeletonGridProps {
  count?: number;
  variant?: 'card' | 'row';
}

export function SkeletonGrid({ count = 6, variant = 'card' }: SkeletonGridProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) =>
        variant === 'card' ? <SkeletonCard key={i} /> : <SkeletonRow key={i} />
      )}
    </>
  );
}
