import { useAdminStore } from '../../store/useAdminStore';

export function Toast() {
  const toast = useAdminStore((state) => state.toast);

  if (!toast) return null;

  return (
    <div
      className={[
        'fixed bottom-5 left-4 right-4 z-50 rounded-md px-4 py-3 text-sm font-semibold shadow-lg sm:left-auto sm:right-5 sm:w-80',
        toast.type === 'success' ? 'bg-moss text-white' : 'bg-red-700 text-white',
      ].join(' ')}
      role="status"
    >
      {toast.message}
    </div>
  );
}
