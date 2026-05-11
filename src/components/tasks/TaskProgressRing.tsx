// ============================================================
// TaskProgressRing — Radial SVG progress ring
// ============================================================
interface TaskProgressRingProps {
  percent: number;      // 0–100
  size?: number;        // px (default 56)
  stroke?: number;      // stroke width (default 5)
  color?: string;       // hex or CSS color
  label?: string;       // center text override
}

export function TaskProgressRing({
  percent,
  size = 56,
  stroke = 5,
  color,
  label,
}: TaskProgressRingProps) {
  const r = (size - stroke * 2) / 2;
  const circ = 2 * Math.PI * r;
  const dash = circ - (circ * Math.min(100, Math.max(0, percent))) / 100;

  const ringColor =
    color ??
    (percent >= 80
      ? '#10b981'   // emerald
      : percent >= 50
      ? '#8b5cf6'   // violet
      : percent >= 25
      ? '#f59e0b'   // amber
      : '#ef4444'); // red

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={stroke}
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={ringColor}
          strokeWidth={stroke}
          strokeDasharray={circ}
          strokeDashoffset={dash}
          strokeLinecap="round"
          className="transition-all duration-700 ease-out"
        />
      </svg>
      <span
        className="absolute text-xs font-bold"
        style={{ color: ringColor, fontSize: size < 50 ? 9 : 11 }}
      >
        {label ?? `${percent}%`}
      </span>
    </div>
  );
}
