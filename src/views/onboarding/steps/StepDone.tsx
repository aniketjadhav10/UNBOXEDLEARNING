// ============================================================
// Step 5 — Done / Celebration
// ============================================================
import { PartyPopper, ArrowRight, Users, BookOpen, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../../../context/OnboardingContext';

export function StepDone() {
  const { state, markComplete } = useOnboarding();
  const router = useRouter();

  const achievements = [
    state.familyName && { icon: '🏠', label: 'Family workspace created', value: state.familyName },
    state.children.length > 0 && { icon: '👶', label: 'Children added', value: `${state.children.length} learner${state.children.length !== 1 ? 's' : ''}` },
    (state.generatedSubjectId || state.assignedTasksCount > 0) && {
      icon: '📚',
      label: 'Curriculum set up',
      value: state.generatedSubjectId ? 'AI generated' : `${state.assignedTasksCount} task${state.assignedTasksCount !== 1 ? 's' : ''} assigned`,
    },
    state.coParentEmail && { icon: '📧', label: 'Co-parent invited', value: state.coParentEmail },
  ].filter(Boolean) as { icon: string; label: string; value: string }[];

  const nextSteps = [
    { icon: BookOpen, label: 'Browse Subjects', path: '/subjects' },
    { icon: Sparkles, label: 'Generate More Curriculum', path: '/syllabus-generator' },
    { icon: Users, label: 'Manage Family', path: '/family' },
  ];

  function handleGoToDashboard() {
    markComplete();
    router.push('/');
  }

  function handleGoTo(path: string) {
    markComplete();
    router.push(path);
  }

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center">
        <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-3 shadow-lg">
          <PartyPopper size={30} className="text-white" />
        </div>
        <h2 className="text-2xl font-black text-gray-900">You're All Set! 🎉</h2>
        <p className="text-sm text-gray-500 mt-1">
          Your UnBoxed Learning workspace is ready. Here's what was set up:
        </p>
      </div>

      {/* Setup summary */}
      {achievements.length > 0 && (
        <div className="space-y-2">
          {achievements.map((a) => (
            <div key={a.label} className="flex items-center gap-3 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
              <span className="text-lg">{a.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-emerald-700">{a.label}</p>
                <p className="text-xs text-emerald-600 truncate">{a.value}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick links */}
      <div className="space-y-2">
        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Quick Actions</p>
        {nextSteps.map(({ icon: Icon, label, path }) => (
          <button
            key={path}
            onClick={() => handleGoTo(path)}
            className="w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 hover:bg-violet-50 hover:border-violet-200 border border-gray-100 rounded-xl text-left transition-all group"
          >
            <Icon size={16} className="text-gray-400 group-hover:text-violet-500 transition-colors" />
            <span className="text-sm font-semibold text-gray-700 flex-1">{label}</span>
            <ArrowRight size={14} className="text-gray-300 group-hover:text-violet-400 transition-colors" />
          </button>
        ))}
      </div>

      <button
        onClick={handleGoToDashboard}
        className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-black rounded-2xl transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2"
      >
        Go to Dashboard <ArrowRight size={16} />
      </button>
    </div>
  );
}
