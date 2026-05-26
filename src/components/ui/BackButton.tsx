import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function BackButton({ className = '' }: { className?: string }) {
  const navigate = useNavigate();

  return (
    <button
      onClick={() => navigate(-1)}
      className={`flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-violet-600 transition-colors ${className}`}
      aria-label="Go back"
    >
      <ChevronLeft size={18} className="-ml-1" /> Back
    </button>
  );
}
