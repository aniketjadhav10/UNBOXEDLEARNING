// EmptyState — all props optional so admin pages that use bare <EmptyState /> still work
import { InboxIcon, type LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title?: string;
  description?: string;
  /** Legacy prop used by old admin pages */
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon: Icon = InboxIcon,
  title = 'Nothing here yet',
  description,
  message,
  actionLabel,
  onAction,
}: EmptyStateProps) {
  const body = description ?? message ?? 'No records to display.';

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-20 h-20 bg-violet-50 rounded-full flex items-center justify-center mb-5">
        <Icon size={32} className="text-violet-400" />
      </div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">{title}</h3>
      <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-6">{body}</p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors duration-200"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
