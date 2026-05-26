// ============================================================
// ThisWeekPage — Shows all tasks marked as "scheduled this week"
// ============================================================
import { CalendarCheck, Search, BrainCircuit, Target, Star, RefreshCw, AlertTriangle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BackButton } from '../../components/ui/BackButton';
import { HierarchicalCard } from '../../components/curriculum/HierarchicalCard';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDebounce } from '../../hooks/useDebounce';
import { supabase } from '../../services/supabase';
import { StaggerContainer, StaggerItem } from '../../components/motion/MotionWrappers';
import { useToast } from '../../store/useToastStore';
import type { SupabaseTaskProgress, LearningStage } from '../../types/taskTypes';
import type { DbTask, DbTopic, DbSubject } from '../../types/database';

interface WeekTask {
  task: DbTask;
  topic: DbTopic | null;
  subject: DbSubject | null;
  progress: SupabaseTaskProgress;
}

export function ThisWeekPage() {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { kids, rawTopics, rawSubjects } = useData();
  const { selectedChildId } = useSettingsStore();

  const resolvedChildId = selectedChildId || (kids.length === 1 ? kids[0].id : null);
  const childId = isAdmin ? (resolvedChildId || user?.id || '') : (user?.id || '');

  const [weekTasks, setWeekTasks] = useState<WeekTask[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounce(search, 300);
  const toast = useToast();

  useDocumentTitle('This Week');

  useEffect(() => {
    if (childId) loadThisWeek();
  }, [childId]);

  async function loadThisWeek() {
    try {
      setLoading(true);
      setError(null);

      // 1. Get all progress records marked as scheduled this week
      const { data: progData, error: progErr } = await supabase
        .from('task_progress')
        .select('*')
        .eq('child_id', childId)
        .eq('is_scheduled_this_week', true)
        .eq('is_active', true);

      if (progErr) throw new Error(progErr.message);
      if (!progData || progData.length === 0) {
        setWeekTasks([]);
        setLoading(false);
        return;
      }

      // 2. Fetch the tasks
      const taskIds = progData.map(p => p.task_id);
      const { data: tasksData, error: taskErr } = await supabase
        .from('tasks')
        .select('*')
        .in('id', taskIds)
        .eq('is_active', true);

      if (taskErr) throw new Error(taskErr.message);

      // 3. Build the combined list
      const taskMap = new Map((tasksData ?? []).map(t => [t.id, t]));
      const topicMap = new Map(rawTopics.map(t => [t.id, t]));
      const subjectMap = new Map(rawSubjects.map(s => [s.id, s]));

      const combined: WeekTask[] = progData
        .filter(p => taskMap.has(p.task_id))
        .map(p => {
          const task = taskMap.get(p.task_id)!;
          const topic = topicMap.get(task.topic_id) ?? null;
          const subject = topic ? (subjectMap.get(topic.subject_id) ?? null) : null;
          return { task, topic, subject, progress: p };
        });

      setWeekTasks(combined);
    } catch (err) {
      setError((err as Error).message || 'Failed to load this week\'s tasks.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStageChange(progressId: string, newStage: LearningStage) {
    try {
      const { error: updateErr } = await supabase
        .from('task_progress')
        .update({ learning_stage: newStage })
        .eq('id', progressId);

      if (updateErr) throw new Error(updateErr.message);

      // Update local state
      setWeekTasks(prev => prev.map(wt => 
        wt.progress.id === progressId 
          ? { ...wt, progress: { ...wt.progress, learning_stage: newStage } } 
          : wt
      ));
      toast.success('Learning stage updated');
    } catch (err) {
      toast.error('Failed to update stage');
    }
  }

  const filtered = weekTasks.filter(wt =>
    wt.task.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    wt.subject?.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
    wt.topic?.title.toLowerCase().includes(debouncedSearch.toLowerCase())
  );

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-5 w-64 skeleton-shimmer rounded" />
      <SkeletonGrid count={6} />
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4">
        <AlertTriangle size={24} className="text-red-400" />
      </div>
      <h3 className="text-base font-bold text-gray-800 mb-2">Failed to load</h3>
      <p className="text-sm text-gray-400 mb-4">{error}</p>
      <button
        onClick={loadThisWeek}
        className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
      >
        Try Again
      </button>
    </div>
  );

  return (
    <div className="animate-fade-in pb-4">
      <div className="mb-2">
        <BackButton />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-violet-100 rounded-xl flex items-center justify-center">
            <CalendarCheck size={20} className="text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900">This Week</h1>
            <p className="text-sm text-gray-400">
              {filtered.length} task{filtered.length !== 1 ? 's' : ''} scheduled for this week
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm bg-white border border-gray-100 rounded-2xl outline-none focus:ring-4 focus:ring-violet-50 focus:border-violet-300 transition-all shadow-sm"
              aria-label="Search this week's tasks"
            />
          </div>
          <button
            onClick={loadThisWeek}
            className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 rounded-xl transition-colors flex-shrink-0"
            aria-label="Refresh"
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>

      {weekTasks.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title="No tasks scheduled this week"
          description="Mark tasks as 'Scheduled This Week' from the task schedule dialog to see them here."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching tasks"
          description="Try a different search term."
        />
      ) : (
        <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((wt) => {
            const { task, topic, subject, progress: prog } = wt;
            const targetCount = prog.target_count ?? 5;
            const learnedCount = prog.learned_count ?? 0;
            const progressPct = Math.min(100, Math.round((learnedCount / targetCount) * 100));

            const currentStage = prog.learning_stage || 'Not_Started';
            const stageStyles: Record<string, string> = {
              Not_Started: 'bg-gray-50 text-gray-500 border-gray-200/60 hover:bg-gray-100/80',
              Introduced: 'bg-blue-50/70 text-blue-700 border-blue-200/50 hover:bg-blue-100/60',
              Practicing: 'bg-violet-50/70 text-violet-700 border-violet-200/50 hover:bg-violet-100/60',
              Comfortable: 'bg-amber-50/70 text-amber-700 border-amber-200/50 hover:bg-amber-100/60',
              Confident: 'bg-emerald-50/70 text-emerald-700 border-emerald-200/50 hover:bg-emerald-100/60',
              Needs_Practice: 'bg-red-50/70 text-red-700 border-red-200/50 hover:bg-red-100/60',
            };
            const currentStyle = stageStyles[currentStage] || stageStyles.Not_Started;

            return (
              <StaggerItem key={task.id}>
                <HierarchicalCard
                  title={task.name}
                  subtitle={subject?.name ? `${subject.name} › ${topic?.title ?? ''}` : (topic?.title || undefined)}
                  description={task.description || undefined}
                  icon={<CalendarCheck size={20} />}
                  progress={progressPct}
                  footerItems={[
                    {
                      label: 'Stage',
                      value: (
                        <div className="relative inline-flex items-center mt-1">
                          <select
                            value={currentStage}
                            onChange={(e) => handleStageChange(prog.id, e.target.value as LearningStage)}
                            onClick={(e) => e.stopPropagation()}
                            className={`pl-2 pr-6 py-0.5 text-[10px] font-black rounded-full border transition-all cursor-pointer outline-none appearance-none ${currentStyle}`}
                            style={{
                              backgroundImage: `url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234b5563' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                              backgroundRepeat: 'no-repeat',
                              backgroundPosition: 'right 6px center',
                              backgroundSize: '8px'
                            }}
                          >
                            <option value="Not_Started">⚪ Not Started</option>
                            <option value="Introduced">🌱 Introduced</option>
                            <option value="Practicing">🔄 Practicing</option>
                            <option value="Comfortable">📈 Comfortable</option>
                            <option value="Confident">⭐ Confident</option>
                            <option value="Needs_Practice">🔁 Needs Practice</option>
                          </select>
                        </div>
                      ),
                      icon: <BrainCircuit size={12} />
                    },
                    { label: 'Count', value: `${learnedCount} / ${targetCount}`, icon: <Target size={12} /> },
                    { label: 'Interest', value: `${prog.interest_level ?? 3} / 5`, icon: <Star size={12} /> },
                  ]}
                  onEdit={() => {}}
                  onDelete={() => {}}
                  onClick={() => navigate(`/tasks/${task.id}/activities`)}
                />
              </StaggerItem>
            );
          })}
        </StaggerContainer>
      )}
    </div>
  );
}
