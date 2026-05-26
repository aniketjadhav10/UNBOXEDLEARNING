// Loading skeleton placeholder cards
interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps = {}) {
  return (
    <div className={`bg-white rounded-2xl p-5 shadow-card ${className ?? ''}`}>
      {/* Icon placeholder */}
      <div className="w-12 h-12 skeleton-shimmer rounded-xl mb-4" />
      {/* Title */}
      <div className="h-4 skeleton-shimmer rounded-full w-3/4 mb-2" />
      {/* Description lines */}
      <div className="h-3 skeleton-shimmer rounded-full w-full mb-1.5" style={{ animationDelay: '0.1s' }} />
      <div className="h-3 skeleton-shimmer rounded-full w-5/6 mb-4" style={{ animationDelay: '0.2s' }} />
      {/* Progress bar */}
      <div className="h-2 skeleton-shimmer rounded-full w-full mb-1" style={{ animationDelay: '0.3s' }} />
      <div className="flex justify-between">
        <div className="h-3 skeleton-shimmer rounded-full w-1/4" style={{ animationDelay: '0.35s' }} />
        <div className="h-3 skeleton-shimmer rounded-full w-1/5" style={{ animationDelay: '0.4s' }} />
      </div>
    </div>
  );
}

interface SkeletonRowProps {
  className?: string;
}

export function SkeletonRow({ className }: SkeletonRowProps = {}) {
  return (
    <div className={`bg-white rounded-xl p-4 shadow-card flex gap-4 items-start ${className ?? ''}`}>
      <div className="w-10 h-10 skeleton-shimmer rounded-lg flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="h-4 skeleton-shimmer rounded-full w-2/3" />
        <div className="h-3 skeleton-shimmer rounded-full w-full" style={{ animationDelay: '0.1s' }} />
        <div className="h-3 skeleton-shimmer rounded-full w-4/5" style={{ animationDelay: '0.2s' }} />
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
