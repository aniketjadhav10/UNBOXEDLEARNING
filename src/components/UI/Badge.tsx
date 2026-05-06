// Reusable Badge/Chip component
interface BadgeProps {
  label: string;
  variant?: 'violet' | 'green' | 'amber' | 'blue' | 'pink' | 'gray' | 'red';
  size?: 'sm' | 'md';
}

const variantStyles: Record<string, string> = {
  violet: 'bg-violet-100 text-violet-700',
  green:  'bg-emerald-100 text-emerald-700',
  amber:  'bg-amber-100 text-amber-700',
  blue:   'bg-blue-100 text-blue-700',
  pink:   'bg-pink-100 text-pink-700',
  gray:   'bg-gray-100 text-gray-600',
  red:    'bg-red-100 text-red-700',
};

const sizeStyles: Record<string, string> = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
};

export function Badge({ label, variant = 'violet', size = 'sm' }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${variantStyles[variant]} ${sizeStyles[size]}`}
    >
      {label}
    </span>
  );
}

// Difficulty badge with auto-color
export function DifficultyBadge({ level }: { level: 'Beginner' | 'Intermediate' | 'Advanced' }) {
  const map: Record<string, BadgeProps['variant']> = {
    Beginner:     'green',
    Intermediate: 'amber',
    Advanced:     'red',
  };
  return <Badge label={level} variant={map[level]} />;
}

// Status badge for activities
export function StatusBadge({ status }: { status: 'pending' | 'in-progress' | 'completed' }) {
  const map: Record<string, { variant: BadgeProps['variant']; label: string }> = {
    pending:     { variant: 'gray',   label: 'Pending' },
    'in-progress': { variant: 'blue', label: 'In Progress' },
    completed:   { variant: 'green',  label: 'Completed' },
  };
  const { variant, label } = map[status];
  return <Badge label={label} variant={variant} />;
}
