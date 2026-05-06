// Reusable ProgressBar component
interface ProgressBarProps {
  value: number; // 0-100
  size?: 'sm' | 'md' | 'lg';
  color?: string; // Tailwind gradient class
  showLabel?: boolean;
  className?: string;
}

export function ProgressBar({
  value,
  size = 'md',
  color = 'from-violet-500 to-purple-600',
  showLabel = false,
  className = '',
}: ProgressBarProps) {
  const pct = Math.min(100, Math.max(0, value));

  const heights: Record<string, string> = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-xs font-medium">
          <span className="text-gray-500">Progress</span>
          <span className="text-violet-600">{pct}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-100 rounded-full overflow-hidden ${heights[size]}`}>
        <div
          className={`${heights[size]} rounded-full bg-gradient-to-r ${color} transition-all duration-700 ease-out`}
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
    </div>
  );
}
