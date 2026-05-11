// ============================================================
// TaskToast — Page-level toast notifications for task actions
// ============================================================
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import type { ToastMessage } from '../../hooks/useTaskManagement';

interface TaskToastContainerProps {
  toasts: ToastMessage[];
}

const TOAST_STYLES: Record<string, { bg: string; border: string; icon: React.ElementType; iconColor: string }> = {
  success: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: CheckCircle2, iconColor: 'text-emerald-600' },
  error:   { bg: 'bg-red-50',     border: 'border-red-200',     icon: AlertCircle,  iconColor: 'text-red-600'     },
  info:    { bg: 'bg-blue-50',    border: 'border-blue-200',    icon: Info,         iconColor: 'text-blue-600'    },
};

export function TaskToastContainer({ toasts }: TaskToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-4 z-[60] flex flex-col gap-2 max-w-xs w-full"
      role="region"
      aria-label="Notifications"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const cfg = TOAST_STYLES[toast.type] ?? TOAST_STYLES.info;
        const Icon = cfg.icon;
        return (
          <div
            key={toast.id}
            className={[
              'flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg animate-fade-in',
              cfg.bg,
              cfg.border,
            ].join(' ')}
            role="status"
          >
            <Icon size={16} className={`${cfg.iconColor} flex-shrink-0 mt-0.5`} />
            <p className="text-sm font-medium text-gray-700 flex-1">{toast.message}</p>
          </div>
        );
      })}
    </div>
  );
}
