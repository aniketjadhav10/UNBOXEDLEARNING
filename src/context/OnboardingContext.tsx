// ============================================================
// OnboardingContext — Wizard state with localStorage persistence
// ============================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';

const STORAGE_KEY = 'onboarding_v1';
export const TOTAL_STEPS = 6;

// ── State shape ───────────────────────────────────────────────
export interface OnboardingState {
  currentStep: number;
  completed: boolean;
  familyId: string | null;
  familyName: string;
  children: { id: string; name: string }[];
  selectedChildId: string | null;
  coParentEmail: string;
  assignedTasksCount: number;
  generatedSubjectId: string | null;
}

const DEFAULT_STATE: OnboardingState = {
  currentStep: 0,
  completed: false,
  familyId: null,
  familyName: '',
  children: [],
  selectedChildId: null,
  coParentEmail: '',
  assignedTasksCount: 0,
  generatedSubjectId: null,
};

// ── Context shape ─────────────────────────────────────────────
interface OnboardingContextValue {
  state: OnboardingState;
  goNext: () => void;
  goPrev: () => void;
  skipStep: () => void;
  update: (patch: Partial<OnboardingState>) => void;
  markComplete: () => void;
  reset: () => void;
}

const OnboardingContext = createContext<OnboardingContextValue | null>(null);

// ── Provider ──────────────────────────────────────────────────
export function OnboardingProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<OnboardingState>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { ...DEFAULT_STATE, ...JSON.parse(raw) };
    } catch {
      // Corrupt storage — reset cleanly
    }
    return DEFAULT_STATE;
  });

  // Persist on every change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const update = useCallback((patch: Partial<OnboardingState>) => {
    setState((s) => ({ ...s, ...patch }));
  }, []);

  const goNext = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStep: Math.min(s.currentStep + 1, TOTAL_STEPS - 1),
    }));
  }, []);

  const goPrev = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStep: Math.max(s.currentStep - 1, 0),
    }));
  }, []);

  const skipStep = useCallback(() => {
    setState((s) => ({
      ...s,
      currentStep: Math.min(s.currentStep + 1, TOTAL_STEPS - 1),
    }));
  }, []);

  const markComplete = useCallback(() => {
    setState((s) => ({ ...s, completed: true }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, completed: true }));
  }, [state]);

  const reset = useCallback(() => {
    setState(DEFAULT_STATE);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return (
    <OnboardingContext.Provider value={{ state, goNext, goPrev, skipStep, update, markComplete, reset }}>
      {children}
    </OnboardingContext.Provider>
  );
}

// ── Hook ──────────────────────────────────────────────────────
export function useOnboarding() {
  const ctx = useContext(OnboardingContext);
  if (!ctx) throw new Error('useOnboarding must be used inside <OnboardingProvider>');
  return ctx;
}

// ── Helper: is onboarding complete? ──────────────────────────
export function isOnboardingComplete(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    return JSON.parse(raw).completed === true;
  } catch {
    return false;
  }
}
