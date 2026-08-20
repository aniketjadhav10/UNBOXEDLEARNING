import { ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function BackButton({ className = '' }: { className?: string }) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.back()}
      className={`flex items-center gap-1.5 text-sm font-semibold text-gray-500 hover:text-violet-600 transition-colors ${className}`}
      aria-label="Go back"
    >
      <ChevronLeft size={18} className="-ml-1" /> Back
    </button>
  );
}
