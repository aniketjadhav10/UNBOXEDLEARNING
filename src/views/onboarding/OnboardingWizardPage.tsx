// ============================================================
// OnboardingWizardPage — Full-screen distraction-free wizard
// ============================================================
import { X, GraduationCap } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOnboarding, TOTAL_STEPS } from '../../context/OnboardingContext';
import { useAuth } from '../../context/AuthContext';
import { StepWelcome }          from './steps/StepWelcome';
import { StepCreateFamily }     from './steps/StepCreateFamily';
import { StepAddChild }         from './steps/StepAddChild';
import { StepInviteCoParent }   from './steps/StepInviteCoParent';
import { StepDone }             from './steps/StepDone';

const STEP_LABELS = [
  'Welcome',
  'Family',
  'Children',
  'Co-parent',
  'Done',
];

const STEP_COMPONENTS = [
  StepWelcome,
  StepCreateFamily,
  StepAddChild,
  StepInviteCoParent,
  StepDone,
];

// ── Inner wizard (has access to OnboardingContext) ────────────
function WizardInner() {
  const { state, goPrev, markComplete } = useOnboarding();
  const { markOnboardedLocally } = useAuth();
  const router = useRouter();
  const { currentStep } = state;

  const StepComponent = STEP_COMPONENTS[currentStep] ?? StepDone;
  const isFirstStep = currentStep === 0;
  const isLastStep  = currentStep === TOTAL_STEPS - 1;

  async function handleExit() {
    // Mark complete in DB and locally, then navigate to dashboard
    await markComplete();
    markOnboardedLocally();
    router.push('/');
  }

  return (
    <div className="min-h-screen flex">
      {/* ── Left panel — branding + step dots ────────────────── */}
      <div className="hidden md:flex flex-col w-80 bg-gradient-to-b from-violet-700 to-indigo-800 p-8 relative overflow-hidden flex-shrink-0">
        {/* Background decoration */}
        <div className="absolute -top-20 -right-20 w-64 h-64 bg-white/5 rounded-full" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-white/5 rounded-full" />

        {/* Logo */}
        <div className="flex items-center gap-2.5 mb-12 relative z-10">
          <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center">
            <GraduationCap size={18} className="text-white" />
          </div>
          <span className="text-white font-black text-sm tracking-wide">UnBoxed Learning</span>
        </div>

        {/* Step dots */}
        <div className="flex flex-col gap-3 relative z-10">
          {STEP_LABELS.map((label, i) => {
            const isPast    = i < currentStep;
            const isCurrent = i === currentStep;
            return (
              <div key={label} className="flex items-center gap-3">
                <div
                  className={[
                    'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all duration-300',
                    isPast    ? 'bg-emerald-400 text-white scale-95'  : '',
                    isCurrent ? 'bg-white text-violet-700 scale-110 shadow-lg' : '',
                    !isPast && !isCurrent ? 'bg-white/20 text-white/50' : '',
                  ].join(' ')}
                >
                  {isPast ? '✓' : i + 1}
                </div>
                <span
                  className={[
                    'text-sm transition-all duration-300',
                    isCurrent ? 'text-white font-bold' : isPast ? 'text-emerald-300 font-medium' : 'text-white/40',
                  ].join(' ')}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Bottom stat */}
        <div className="mt-auto relative z-10">
          <div className="bg-white/10 rounded-2xl p-4">
            <p className="text-white/60 text-xs mb-1">Progress</p>
            <div className="h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div
                className="h-full bg-white rounded-full transition-all duration-500"
                style={{ width: `${((currentStep + 1) / TOTAL_STEPS) * 100}%` }}
              />
            </div>
            <p className="text-white text-xs font-bold mt-1.5">
              Step {currentStep + 1} of {TOTAL_STEPS}
            </p>
          </div>
        </div>
      </div>

      {/* ── Right panel — form content ────────────────────────── */}
      <div className="flex-1 flex flex-col bg-white relative">
        {/* Top bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
          {/* Mobile step indicator */}
          <div className="flex items-center gap-2 md:hidden">
            <div className="w-6 h-6 bg-violet-600 rounded-full flex items-center justify-center text-xs text-white font-bold">
              {currentStep + 1}
            </div>
            <span className="text-xs font-semibold text-gray-600">
              {STEP_LABELS[currentStep]} · {currentStep + 1}/{TOTAL_STEPS}
            </span>
          </div>
          <div className="hidden md:block text-sm font-semibold text-gray-400">
            Step {currentStep + 1} — {STEP_LABELS[currentStep]}
          </div>

          {/* Mobile progress dots */}
          <div className="flex gap-1.5 md:hidden">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={[
                  'h-1.5 rounded-full transition-all duration-300',
                  i === currentStep ? 'w-4 bg-violet-600' : i < currentStep ? 'w-2 bg-emerald-400' : 'w-2 bg-gray-200',
                ].join(' ')}
              />
            ))}
          </div>

          {!isLastStep && (
            <button
              onClick={handleExit}
              className="p-1.5 text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              title="Exit setup (you can return later from Settings)"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Step content — animated slide */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10 animate-fade-in">
          <div className="max-w-md mx-auto">
            <StepComponent />
          </div>
        </div>

        {/* Bottom nav — only show Prev on non-first, non-last steps */}
        {!isFirstStep && !isLastStep && (
          <div className="px-6 md:px-10 py-4 border-t border-gray-50 flex-shrink-0">
            <button
              onClick={goPrev}
              className="text-xs text-gray-400 hover:text-gray-600 font-semibold transition-colors"
            >
              ← Back
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Public export — wraps in OnboardingProvider ───────────────
export function OnboardingWizardPage() {
  const { OnboardingProvider } = require('../../context/OnboardingContext');
  return (
    <OnboardingProvider>
      <WizardInner />
    </OnboardingProvider>
  );
}
