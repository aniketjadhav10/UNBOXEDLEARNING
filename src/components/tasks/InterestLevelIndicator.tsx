// ============================================================
// InterestLevelIndicator — Emoji star display for interest 1-5
// ============================================================
import type { InterestLevel } from '../../types/taskTypes';
import { Heart, HeartOff } from 'lucide-react';

interface InterestLevelIndicatorProps {
  level: InterestLevel | number;
  interactive?: boolean;
  onSelect?: (level: InterestLevel) => void;
  size?: 'sm' | 'md';
}

const LABEL_MAP: Record<number, string> = {
  1: 'Very Low',
  2: 'Low',
  3: 'Moderate',
  4: 'High',
  5: 'Very High',
};

export function InterestLevelIndicator({
  level,
  interactive = false,
  onSelect,
  size = 'sm',
}: InterestLevelIndicatorProps) {
  const label = LABEL_MAP[level] ?? 'Unknown';
  const isLow = level <= 2;
  const iconSize = size === 'sm' ? 12 : 14;

  if (interactive && onSelect) {
    return (
      <div className="flex items-center gap-0.5" title={`Interest: ${label}`}>
        {([1, 2, 3, 4, 5] as InterestLevel[]).map((l) => (
          <button
            key={l}
            onClick={() => onSelect(l)}
            className={[
              'transition-all duration-150 hover:scale-125 focus:outline-none p-0.5',
              l <= level ? (isLow ? 'text-amber-500' : 'text-rose-500') : 'text-gray-200 hover:text-rose-300',
            ].join(' ')}
          >
            <Heart size={iconSize} className={l <= level ? 'fill-current' : ''} />
          </button>
        ))}
      </div>
    );
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-bold rounded-full uppercase tracking-wider',
        size === 'sm' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1',
        isLow
          ? 'bg-amber-50 text-amber-600 border border-amber-200'
          : level >= 4
          ? 'bg-rose-50 text-rose-600 border border-rose-200'
          : 'bg-gray-100 text-gray-500 border border-gray-200',
      ].join(' ')}
      title={`Interest: ${label}`}
    >
      <Heart size={size === 'sm' ? 10 : 12} className="fill-current" />
      <span>{label}</span>
    </span>
  );
}
