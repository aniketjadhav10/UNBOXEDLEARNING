// Activities Page — tasks from DataContext (tasks = the "activities" in this schema)
import { BarChart3, CheckCircle2, Clock, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { useData } from '../../context/DataContext';
import { SkeletonCard } from '../../components/ui/SkeletonCard';

type Filter = 'all' | 'Not_Started' | 'in_progress' | 'completed';

const STAGE_LABELS: Record<string, string> = {
  Not_Started: 'Not Started',
  Introduced:  'Introduced',
  Practicing:  'Practicing',
  Comfortable: 'Comfortable',
  Confident:   'Confident',
  Needs_Practice: 'Needs Practice',
};

const STAGE_COLORS: Record<string, string> = {
  Not_Started:     'bg-gray-100 text-gray-500',
  Introduced:      'bg-blue-100 text-blue-700',
  Practicing:      'bg-violet-100 text-violet-700',
  Comfortable:     'bg-emerald-100 text-emerald-700',
  Confident:       'bg-emerald-200 text-emerald-800',
  Needs_Practice:  'bg-amber-100 text-amber-700',
};

export function ActivitiesPage() {
  const { tasks, topics, subjects, kids, loading, error, refresh } = useData();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const filtered = tasks
    .filter((t) => {
      if (filter === 'completed') return ['Comfortable', 'Confident'].includes(t.stage);
      if (filter === 'in_progress') return ['Introduced', 'Practicing'].includes(t.stage);
      if (filter === 'Not_Started') return t.stage === 'Not_Started' || t.stage === 'Needs_Practice';
      return true;
    })
    .filter((t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description.toLowerCase().includes(search.toLowerCase())
    );

  const completedCount = tasks.filter((t) => ['Comfortable', 'Confident'].includes(t.stage)).length;
  const pendingCount   = tasks.filter((t) => t.stage === 'Not_Started' || t.stage === 'Needs_Practice').length;
  const scheduledCount = tasks.filter((t) => t.isScheduled).length;

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <div className="h-10 bg-gray-200 rounded-xl w-1/3 animate-pulse" />
      {[...Array(5)].map((_, i) => <SkeletonCard key={i} className="h-16" />)}
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
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Activities</h2>
          <p className="text-sm text-gray-400 mt-0.5">{tasks.length} tasks across all subjects</p>
        </div>
        <button onClick={refresh} className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 rounded-xl transition-colors">
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Completed',  value: completedCount,  color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Pending',    value: pendingCount,    color: 'bg-amber-50 text-amber-700'    },
          { label: 'Scheduled',  value: scheduledCount,  color: 'bg-violet-50 text-violet-700'  },
        ].map(({ label, value, color }) => (
          <div key={label} className={`${color} rounded-2xl p-4 text-center`}>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs font-medium opacity-80 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Filters + search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex gap-2 overflow-x-auto hide-scrollbar">
          {(['all', 'Not_Started', 'in_progress', 'completed'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={['px-4 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap',
                filter === f ? 'bg-violet-600 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:border-violet-300'
              ].join(' ')}
            >
              {f === 'all' ? 'All' : f === 'Not_Started' ? 'Not Started' : f === 'in_progress' ? 'In Progress' : 'Completed'}
            </button>
          ))}
        </div>
        <div className="relative flex-1 sm:max-w-xs">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
          />
        </div>
      </div>

      {/* Task list */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <BarChart3 size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-400">No tasks match your filter.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((task) => {
            const topic   = topics.find((t) => t.id === task.topicId);
            const subject = subjects.find((s) => topic && s.id === topic.subjectId);
            const kid     = kids.find((k) => subject && k.id === subject.childId);
            return (
              <div key={task.id} className="bg-white rounded-xl border border-gray-100 hover:border-violet-200 transition-all p-4 flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subject?.gradient ?? 'from-gray-400 to-gray-500'} flex items-center justify-center flex-shrink-0`}>
                  {['Comfortable', 'Confident'].includes(task.stage)
                    ? <CheckCircle2 size={16} className="text-white" />
                    : <Clock size={16} className="text-white" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{task.name}</p>
                  <p className="text-xs text-gray-400 truncate">
                    {subject?.emoji} {subject?.name ?? '—'} · {topic?.title ?? '—'}{kid ? ` · ${kid.name}` : ''}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STAGE_COLORS[task.stage] ?? 'bg-gray-100 text-gray-500'}`}>
                    {STAGE_LABELS[task.stage] ?? task.stage}
                  </span>
                  {task.isScheduled && (
                    <span className="text-xs text-violet-500 font-medium">📅 Scheduled</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
