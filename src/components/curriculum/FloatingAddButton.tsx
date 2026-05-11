// ============================================================
// FloatingAddButton — Compact UI action for adding items
// ============================================================
import { Plus } from 'lucide-react';

interface FloatingAddButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function FloatingAddButton({ onClick, label, className = '' }: FloatingAddButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`fixed bottom-8 right-8 z-50 flex items-center gap-2 px-5 py-4 bg-violet-600 hover:bg-violet-700 text-white rounded-3xl shadow-2xl shadow-violet-300 transition-all duration-300 hover:scale-110 active:scale-95 group ${className}`}
      aria-label={label || 'Add Item'}
    >
      <Plus size={24} className="transition-transform group-hover:rotate-90" />
      {label && <span className="font-bold text-sm">{label}</span>}
    </button>
  );
}
