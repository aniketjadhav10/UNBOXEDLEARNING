// ============================================================
// Step 0 — Welcome
// ============================================================
import { GraduationCap, BookOpen, Users, Sparkles } from 'lucide-react';
import { useOnboarding } from '../../../context/OnboardingContext';

export function StepWelcome() {
  const { goNext } = useOnboarding();

  const features = [
    { icon: GraduationCap, title: 'Track Learning', desc: 'Monitor your children\'s progress across subjects and topics' },
    { icon: BookOpen,       title: 'AI Curriculum',   desc: 'Generate personalised syllabuses in seconds with AI'             },
    { icon: Users,          title: 'Family Access',   desc: 'Invite co-parents to collaborate on curriculum management'      },
    { icon: Sparkles,       title: 'Smart Insights',  desc: 'AI-powered recommendations and mastery predictions'             },
  ];

  return (
    <div className="flex flex-col items-center text-center h-full justify-center px-2">
      {/* Hero icon */}
      <div className="w-20 h-20 bg-white/20 rounded-3xl flex items-center justify-center mb-6 shadow-xl">
        <GraduationCap size={40} className="text-white" />
      </div>

      <h1 className="text-3xl font-black text-white mb-2 leading-tight">
        Welcome to<br />UnBoxed Learning
      </h1>
      <p className="text-violet-200 text-sm mb-8 max-w-xs">
        Your homeschool command centre. Let's set up your family workspace in just a few steps.
      </p>

      {/* Feature bullets */}
      <div className="grid grid-cols-2 gap-3 w-full max-w-xs mb-8">
        {features.map(({ icon: Icon, title, desc }) => (
          <div key={title} className="bg-white/10 backdrop-blur-sm rounded-2xl p-3 text-left">
            <div className="w-8 h-8 bg-white/20 rounded-xl flex items-center justify-center mb-2">
              <Icon size={16} className="text-white" />
            </div>
            <p className="text-xs font-bold text-white">{title}</p>
            <p className="text-[10px] text-violet-200 mt-0.5 leading-relaxed">{desc}</p>
          </div>
        ))}
      </div>

      <button
        onClick={goNext}
        className="w-full max-w-xs py-3.5 bg-white text-violet-700 font-bold rounded-2xl hover:bg-violet-50 transition-all shadow-lg active:scale-95 text-sm"
      >
        Let's Get Started →
      </button>
    </div>
  );
}
