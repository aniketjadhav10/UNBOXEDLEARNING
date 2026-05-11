// ============================================================
// InterestLevelIndicator — Emoji star display for interest 1-5
// ============================================================
import type { InterestLevel } from '../../types/taskTypes';

interface InterestLevelIndicatorProps {
  level: InterestLevel | number;
  interactive?: boolean;
  onSelect?: (level: InterestLevel) => void;
  size?: 'sm' | 'md';
}

const EMOJI_MAP: Record<number, string> = {
  1: '😴',
  2: '😐',
  3: '🙂',
  4: '😊',
  5: '🤩',
};

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
  const emoji = EMOJI_MAP[level] ?? '😐';
  const label = LABEL_MAP[level] ?? 'Unknown';
  const isLow = level <= 2;

  if (interactive && onSelect) {
    return (
      <div className="flex items-center gap-1">
        {([1, 2, 3, 4, 5] as InterestLevel[]).map((l) => (
          <button
            key={l}
            onClick={() => onSelect(l)}
            title={LABEL_MAP[l]}
            className={[
              'transition-all duration-150 hover:scale-125 focus:outline-none',
              size === 'sm' ? 'text-base' : 'text-xl',
              l <= level ? 'opacity-100' : 'opacity-30',
            ].join(' ')}
          >
            ⭐
          </button>
        ))}
      </div>
    );
  }

  return (
    <span
      className={[
        'inline-flex items-center gap-1 font-medium rounded-full',
        size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-2.5 py-1',
        isLow
          ? 'bg-orange-50 text-orange-600'
          : level >= 4
          ? 'bg-emerald-50 text-emerald-600'
          : 'bg-gray-50 text-gray-500',
      ].join(' ')}
      title={`Interest: ${label}`}
    >
      <span>{emoji}</span>
      <span>{label}</span>
      {isLow && <span className="text-orange-400">⚠</span>}
    </span>
  );
}
