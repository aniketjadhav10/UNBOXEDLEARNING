// Progress Page — real data from DataContext
import { TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SkeletonCard } from '../../components/ui/SkeletonCard';

export function ProgressPage() {
  const { subjects, topics, loading, error, refresh } = useData();

  const completed = topics.filter((t) => t.completed).length;
  const total     = topics.length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <SkeletonCard className="h-40" />
      {[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-12" />)}
    </div>
  );

  if (error) return (
    <div className="text-center py-20">
      <p className="text-sm text-red-400 mb-3">{error}</p>
      <button onClick={refresh} className="px-4 py-2 bg-violet-600 text-white text-sm rounded-xl">Retry</button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Progress</h2>
        <p className="text-sm text-gray-400 mt-0.5">Track your learning journey</p>
      </div>

      {/* Overall banner */}
      <div className="bg-gradient-to-br from-violet-600 to-purple-700 rounded-3xl p-6 text-white text-center">
        <TrendingUp size={28} className="mx-auto mb-3 opacity-80" />
        <p className="text-5xl font-black mb-2">{pct}%</p>
        <p className="text-violet-200 text-sm">Overall Completion</p>
        <p className="text-violet-300 text-xs mt-1">{completed} of {total} topics completed</p>
        <div className="mt-4 bg-white/10 rounded-full overflow-hidden h-3">
          <div className="h-3 bg-white/80 rounded-full transition-all duration-700" style={{ width: `${pct}%` }} />
        </div>
      </div>

      {/* Per-subject progress */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">By Subject</h3>
          <div className="space-y-4">
            {subjects.map((s) => {
              const subTopics = topics.filter((t) => t.subjectId === s.id);
              const done = subTopics.filter((t) => t.completed).length;
              return (
                <div key={s.id}>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-base">{s.emoji}</span>
                    <span className="text-sm font-semibold text-gray-800 flex-1">{s.name}</span>
                    <span className="text-xs text-gray-400">{done}/{subTopics.length}</span>
                    <span className="text-xs font-bold text-violet-600">{s.progress}%</span>
                  </div>
                  <ProgressBar value={s.progress} size="sm" color={s.gradient} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Milestones — computed from real data */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
        <h3 className="text-base font-bold text-gray-900 mb-3">Milestones</h3>
        <div className="space-y-3">
          {[
            { label: 'First Topic Done',       done: completed >= 1,  emoji: '🎉' },
            { label: '5 Topics Completed',     done: completed >= 5,  emoji: '⭐' },
            { label: '10 Topics Completed',    done: completed >= 10, emoji: '🏅' },
            { label: 'First Subject Done',     done: subjects.some((s) => s.progress === 100), emoji: '🏆' },
            { label: '50% Overall Progress',   done: pct >= 50,       emoji: '🚀' },
            { label: 'All Topics Complete',    done: pct === 100 && total > 0, emoji: '🌟' },
          ].map(({ label, done, emoji }) => (
            <div key={label} className={`flex items-center gap-3 p-3 rounded-xl ${done ? 'bg-emerald-50 border border-emerald-100' : 'bg-gray-50 border border-gray-100'}`}>
              <span className="text-xl">{emoji}</span>
              <p className={`text-sm font-semibold ${done ? 'text-emerald-700' : 'text-gray-400'}`}>{label}</p>
              {done && <span className="ml-auto text-xs font-bold text-emerald-600">✓ Done</span>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
