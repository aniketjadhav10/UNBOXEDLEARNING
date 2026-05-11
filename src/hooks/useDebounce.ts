// ============================================================
// hooks/useDebounce.ts — Debounce hook for search inputs
// ============================================================
import { useEffect, useRef, useState } from 'react';

/** Debounces a value change by the given delay in ms */
export function useDebounce<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState<T>(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}

/** Debounce a callback (e.g. for button spamming) */
export function useDebouncedCallback<T extends (...args: any[]) => any>(
  fn: T,
  delayMs = 300,
): T {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  return ((...args: Parameters<T>) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fn(...args), delayMs);
  }) as T;
}
