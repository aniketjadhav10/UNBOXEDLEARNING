// ============================================================
// components/ui/ConfirmModal.tsx — Replaces window.confirm()
// ============================================================
import { AlertTriangle, Trash2, X } from 'lucide-react';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message?: string;
  confirmLabel?: string;
  danger?: boolean;
  loading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = 'Are you sure?',
  message = 'This action cannot be undone.',
  confirmLabel = 'Confirm',
  danger = true,
  loading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none">
        <div
          className="bg-white w-full max-w-sm rounded-3xl shadow-2xl pointer-events-auto p-6 animate-fade-in"
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="confirm-title"
          aria-describedby="confirm-message"
        >
          {/* Icon */}
          <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-5 ${danger ? 'bg-red-50' : 'bg-violet-50'}`}>
            {danger ? (
              <Trash2 size={24} className="text-red-500" />
            ) : (
              <AlertTriangle size={24} className="text-violet-500" />
            )}
          </div>

          <h3 id="confirm-title" className="text-base font-bold text-gray-900 text-center mb-2">
            {title}
          </h3>
          <p id="confirm-message" className="text-sm text-gray-400 text-center leading-relaxed mb-6">
            {message}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 py-3 text-sm font-bold text-gray-500 bg-gray-100 hover:bg-gray-200 rounded-2xl transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className={[
                'flex-1 py-3 text-sm font-bold text-white rounded-2xl transition-all flex items-center justify-center gap-2',
                danger
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-200 disabled:bg-red-300'
                  : 'bg-violet-600 hover:bg-violet-700 shadow-lg shadow-violet-200 disabled:bg-violet-300',
              ].join(' ')}
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                confirmLabel
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
