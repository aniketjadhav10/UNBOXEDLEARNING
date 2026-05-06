// My Learning Page — Student view, real data from DataContext
import { BookOpen, CheckCircle2, Clock, PlayCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SkeletonCard } from '../../components/ui/SkeletonCard';

export function MyLearningPage() {
  const navigate = useNavigate();
  const { subjects, topics, loading, error, refresh } = useData();

  const inProgress  = subjects.filter((s) => s.progress > 0 && s.progress < 100).slice(0, 4);
  const upNext      = topics.filter((t) => !t.completed).slice(0, 6);

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-32 bg-blue-100 rounded-3xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-28" />)}
      </div>
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
      {/* Banner */}
      <div className="bg-gradient-to-br from-blue-600 to-cyan-600 rounded-3xl p-6 text-white relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full" />
        <p className="text-blue-100 text-sm mb-1">Keep it up! 🎯</p>
        <h2 className="text-2xl font-bold mb-2">My Learning</h2>
        <p className="text-blue-100 text-sm max-w-sm">
          {upNext.length > 0
            ? `You have ${upNext.length} topic${upNext.length !== 1 ? 's' : ''} remaining. Stay consistent!`
            : 'Amazing! All current topics completed. Great work!'}
        </p>
      </div>

      {/* Subjects in progress */}
      {inProgress.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">Continue Learning</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {inProgress.map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/subjects/${s.id}/topics`)}
                className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-4 cursor-pointer hover:border-violet-200 hover:shadow-card-hover transition-all group"
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                    <span className="text-lg">{s.emoji}</span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-gray-900 group-hover:text-violet-700 transition-colors">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.topicsCount} topics</p>
                  </div>
                  <PlayCircle size={20} className="text-violet-400 group-hover:text-violet-600 transition-colors" />
                </div>
                <ProgressBar value={s.progress} size="sm" color={s.gradient} showLabel />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All subjects if none in progress */}
      {inProgress.length === 0 && subjects.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">All Subjects</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjects.slice(0, 4).map((s) => (
              <div
                key={s.id}
                onClick={() => navigate(`/subjects/${s.id}/topics`)}
                className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-4 cursor-pointer hover:border-violet-200 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center`}>
                    <span className="text-lg">{s.emoji}</span>
                  </div>
                  <p className="text-sm font-bold text-gray-900 group-hover:text-violet-700">{s.name}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Up next topics */}
      {upNext.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-gray-900 mb-3">Up Next</h3>
          <div className="space-y-3">
            {upNext.map((t) => {
              const sub = subjects.find((s) => s.id === t.subjectId);
              return (
                <div
                  key={t.id}
                  className="bg-white rounded-xl shadow-card border border-gray-100/80 p-4 flex items-center gap-3 hover:border-violet-200 transition-all cursor-pointer"
                  onClick={() => navigate(`/subjects/${t.subjectId}/topics`)}
                >
                  <div className={`w-9 h-9 rounded-lg bg-gradient-to-br ${sub?.gradient ?? 'from-gray-400 to-gray-500'} flex items-center justify-center flex-shrink-0`}>
                    <BookOpen size={14} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{t.title}</p>
                    <p className="text-xs text-gray-400 truncate">{sub?.name}</p>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock size={11} />
                    <span>{t.duration}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: CheckCircle2, label: 'Completed', value: topics.filter((t) => t.completed).length,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: Clock,        label: 'Remaining', value: topics.filter((t) => !t.completed).length, color: 'text-amber-600',  bg: 'bg-amber-50'   },
          { icon: BookOpen,     label: 'Subjects',  value: subjects.length,                           color: 'text-blue-600',   bg: 'bg-blue-50'    },
        ].map(({ icon: Icon, label, value, color, bg }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
            <Icon size={18} className={`${color} mx-auto mb-2`} />
            <p className={`text-xl font-bold ${color}`}>{value}</p>
            <p className="text-xs text-gray-500">{label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
