// ============================================================
// components/ui/GlobalToast.tsx — Global toast renderer
// Reads from useToastStore — place once in App root layout
// ============================================================
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';
import { useToastStore, type Toast } from '../../store/useToastStore';

const TOAST_CONFIG: Record<Toast['type'], { icon: React.ElementType; classes: string; iconColor: string }> = {
  success: { icon: CheckCircle2,  classes: 'bg-white border-emerald-200 shadow-emerald-100', iconColor: 'text-emerald-500' },
  error:   { icon: XCircle,       classes: 'bg-white border-red-200 shadow-red-100',         iconColor: 'text-red-500'     },
  info:    { icon: Info,           classes: 'bg-white border-blue-200 shadow-blue-100',       iconColor: 'text-blue-500'    },
  warning: { icon: AlertTriangle,  classes: 'bg-white border-amber-200 shadow-amber-100',    iconColor: 'text-amber-500'   },
};

function ToastItem({ toast }: { toast: Toast }) {
  const remove = useToastStore((s) => s.remove);
  const { icon: Icon, classes, iconColor } = TOAST_CONFIG[toast.type];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 40, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.95 }}
      transition={{
        type: 'spring',
        stiffness: 400,
        damping: 25,
      }}
      className={`flex items-start gap-3 w-80 px-4 py-3.5 rounded-2xl border shadow-lg ${classes}`}
      role="alert"
      aria-live="polite"
    >
      <Icon size={18} className={`flex-shrink-0 mt-0.5 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        {toast.title && (
          <p className="text-sm font-bold text-gray-900 leading-tight mb-0.5">{toast.title}</p>
        )}
        <p className="text-sm text-gray-600 leading-snug">{toast.message}</p>
      </div>
      <button
        onClick={() => remove(toast.id)}
        className="flex-shrink-0 p-1 text-gray-300 hover:text-gray-600 rounded-lg transition-colors"
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function GlobalToast() {
  const toasts = useToastStore((s) => s.toasts);

  return (
    <div
      className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 pointer-events-none"
      aria-label="Notifications"
    >
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} />
          </div>
        ))}
      </AnimatePresence>
    </div>
  );
}

