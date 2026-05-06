// Reports Page — real data from DataContext
import { BarChart3, RefreshCw, TrendingUp } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SkeletonCard } from '../../components/ui/SkeletonCard';

export function ReportsPage() {
  const { kids, subjects, topics, loading, error, refresh } = useData();

  const avgOverall = kids.length > 0
    ? Math.round(kids.reduce((a, k) => a + k.progress.overall, 0) / kids.length)
    : 0;
  const topKid = [...kids].sort((a, b) => b.progress.overall - a.progress.overall)[0];
  const completedTopics = topics.filter((t) => t.completed).length;

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      {[...Array(3)].map((_, i) => <SkeletonCard key={i} className="h-32" />)}
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Reports</h2>
          <p className="text-sm text-gray-400 mt-0.5">Progress overview across all kids and subjects</p>
        </div>
        <button onClick={refresh} className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 rounded-xl transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Family Average',   value: `${avgOverall}%`,                      icon: TrendingUp, bg: 'bg-violet-600', desc: 'Overall progress'  },
          { label: 'Top Performer',    value: topKid?.name.split(' ')[0] ?? '—',      icon: BarChart3,  bg: 'bg-emerald-500', desc: 'Highest progress' },
          { label: 'Topics Completed', value: `${completedTopics}/${topics.length}`,  icon: BarChart3,  bg: 'bg-amber-500',   desc: 'Across curriculum'},
        ].map(({ label, value, icon: Icon, bg, desc }) => (
          <div key={label} className={`${bg} rounded-2xl p-5 text-white`}>
            <Icon size={20} className="mb-3 opacity-80" />
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-sm font-semibold mt-0.5">{label}</p>
            <p className="text-xs opacity-70 mt-0.5">{desc}</p>
          </div>
        ))}
      </div>

      {/* Kids progress comparison */}
      {kids.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Kids Progress Comparison</h3>
          <div className="space-y-5">
            {[...kids].sort((a, b) => b.progress.overall - a.progress.overall).map((kid) => (
              <div key={kid.id}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${kid.avatarColor} flex items-center justify-center text-white text-xs font-bold`}>
                      {kid.avatarInitials}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-gray-800">{kid.name}</p>
                      <p className="text-xs text-gray-400">{kid.grade}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-violet-600">{kid.progress.overall}%</span>
                </div>
                <ProgressBar value={kid.progress.overall} size="md" />
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span>📚 {kid.progress.subjectsEnrolled} subjects</span>
                  <span>✅ {kid.progress.activitiesCompleted} tasks done</span>
                  <span>🏆 {kid.progress.achievements} achievements</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Subject performance */}
      {subjects.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
          <h3 className="text-base font-bold text-gray-900 mb-4">Subject Performance</h3>
          <div className="space-y-3">
            {[...subjects].sort((a, b) => b.progress - a.progress).map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="w-8 text-center text-lg">{s.emoji}</span>
                <div className="flex-1">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{s.name}</span>
                    <span className="font-bold text-violet-600">{s.progress}%</span>
                  </div>
                  <ProgressBar value={s.progress} size="sm" color={s.gradient} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {kids.length === 0 && subjects.length === 0 && (
        <div className="text-center py-16">
          <BarChart3 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No data to report yet. Add kids and subjects first.</p>
        </div>
      )}
    </div>
  );
}
