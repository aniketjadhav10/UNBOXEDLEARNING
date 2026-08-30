// Dashboard Page — uses real Supabase data via DataContext
import {
  Activity,
  AlertCircle,
  ArrowRight,
  BookOpen,
  CalendarClock,
  CalendarDays,
  CheckCircle2,
  Clock,
  GraduationCap,
  ListChecks,
  RefreshCw,
  Loader2,
  Sparkles,
  TrendingUp,
  Users,
  Wand2,
  Zap,
} from 'lucide-react';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useTaskManagement } from '../../hooks/useTaskManagement';
import { fetchTasksWithProgress, computeDashboardSummary } from '../../services/taskService';
import { fetchSessions, updateSessionStatus, type ScheduledSessionView } from '../../services/scheduleService';
import { ScheduledTaskCard } from '../../components/tasks/ScheduledTaskCard';
import { DashboardSummaryWidgets } from '../../components/tasks/DashboardSummaryWidgets';
import { masteryRung, type LearningStage } from '../../lib/masteryLadder';
import type { DashboardSummary } from '../../types/taskTypes';
import { StaggerContainer, StaggerItem, ScaleOnHover, AnimatedCounter } from '../../components/motion/MotionWrappers';

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, iconGradient, sub,
}: {
  label: string; value: string | number;
  icon: React.ElementType; iconGradient: string; sub?: string;
}) {
  const numericValue = typeof value === 'string' ? parseInt(value, 10) : value;
  const isNumeric = !isNaN(numericValue) && typeof value !== 'string';
  const suffix = typeof value === 'string' && value.endsWith('%') ? '%' : '';
  const displayNum = suffix ? parseInt(String(value), 10) : numericValue;

  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4 border border-gray-100/80 hover:shadow-card-hover transition-shadow duration-300">
      <div className={`w-12 h-12 bg-gradient-to-br ${iconGradient} rounded-xl flex items-center justify-center flex-shrink-0 shadow-md`}>
        <Icon size={22} className="text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">
          {isNumeric || suffix ? (
            <AnimatedCounter value={displayNum} suffix={suffix} duration={1} />
          ) : (
            value
          )}
        </p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────── */
function SectionHeader({ title, actionLabel, onAction }: {
  title: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-display text-base font-bold text-gray-800">{title}</h2>
      {actionLabel && (
        <button onClick={onAction} className="text-xs font-semibold text-accent-pink hover:opacity-80 transition-opacity">
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

function TodayMetric({ label, value, icon: Icon, tone }: {
  label: string;
  value: string | number;
  icon: React.ElementType;
  tone: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-3 shadow-sm">
      <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-xl ${tone}`}>
        <Icon size={16} />
      </div>
      <p className="text-xl font-black leading-none text-gray-900">{value}</p>
      <p className="mt-1 text-[11px] font-semibold text-gray-400">{label}</p>
    </div>
  );
}

/* ─── Dashboard Page ─────────────────────────────────────────── */
export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const router = useRouter();
  const { kids, subjects, topics, tasks, rawSubjects, rawTopics, rawTasks, taskProgress, loading, error, isEmpty, refresh } = useData();
  const { selectedChildId } = useSettingsStore();

  const resolvedChildId = selectedChildId || (kids.length === 1 ? kids[0].id : null);
  const childId = isAdmin ? (resolvedChildId || user?.id || '') : (user?.id || '');

  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // ── "Needs Attention Today" — overdue/due-today tasks + today's scheduled sessions ──
  const {
    tasks: allTasksWithProgress,
    handleMarkPracticed,
  } = useTaskManagement(childId, 'all');

  const needsAttentionTasks = useMemo(
    () => allTasksWithProgress.filter((t) => t.is_active !== false && (t.isOverdue || t.isDueToday)).slice(0, 5),
    [allTasksWithProgress],
  );

  const [todaySessions, setTodaySessions] = useState<ScheduledSessionView[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);

  const loadTodaySessions = useCallback(async () => {
    if (!childId) return;
    setSessionsLoading(true);
    try {
      const todayIso = new Date().toISOString().split('T')[0];
      const sessions = await fetchSessions(childId, { from: todayIso, to: todayIso });
      setTodaySessions(sessions.filter((s) => s.status === 'planned'));
    } catch {
      // non-critical — dashboard still works without today's sessions
    } finally {
      setSessionsLoading(false);
    }
  }, [childId]);

  useEffect(() => { loadTodaySessions(); }, [loadTodaySessions]);

  async function handleGenerateWeekPlan() {
    setGeneratingPlan(true);
    try {
      const res = await fetch('/api/planner/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate plan.');
      await loadTodaySessions();
    } catch (err) {
      console.error('Failed to generate week plan from Today:', err);
    } finally {
      setGeneratingPlan(false);
    }
  }

  const taskById = useMemo(() => new Map(rawTasks.map((task) => [task.id, task])), [rawTasks]);
  const topicById = useMemo(() => new Map(rawTopics.map((topic) => [topic.id, topic])), [rawTopics]);
  const subjectById = useMemo(() => new Map(rawSubjects.map((subject) => [subject.id, subject])), [rawSubjects]);
  const progressByTaskId = useMemo(
    () => new Map(taskProgress.filter((p) => p.child_id === childId).map((p) => [p.task_id, p])),
    [childId, taskProgress],
  );

  async function handleSessionAction(id: string, status: 'completed' | 'skipped' | 'planned') {
    setTodaySessions((prev) => prev.filter((s) => s.id !== id));
    try {
      await updateSessionStatus(id, status);
    } catch {
      loadTodaySessions();
    }
  }

  // ── "Curriculum Gaps" — subjects with no topics or no tasks yet ──
  const curriculumGaps = useMemo(() => {
    return rawSubjects
      .map((s) => {
        const subjectTopics = rawTopics.filter((t) => t.subject_id === s.id);
        const subjectTasks = rawTasks.filter((t) => subjectTopics.some((st) => st.id === t.topic_id));
        return { id: s.id, name: s.name, topicsCount: subjectTopics.length, tasksCount: subjectTasks.length };
      })
      .filter((s) => s.topicsCount === 0 || s.tasksCount === 0)
      .slice(0, 4);
  }, [rawSubjects, rawTopics, rawTasks]);

  useEffect(() => {
    if (!childId) return;

    let active = true;
    async function loadSummary() {
      setSummaryLoading(true);
      try {
        const data = await fetchTasksWithProgress(childId, 'all');
        if (active) {
          setSummary(computeDashboardSummary(data.filter(t => t.is_active !== false)));
        }
      } catch (err) {
        console.error('Failed to load dashboard summary metrics:', err);
      } finally {
        if (active) setSummaryLoading(false);
      }
    }

    loadSummary();
    return () => {
      active = false;
    };
  }, [childId]);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const todayLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  const selectedLearner = kids.find((kid) => kid.id === resolvedChildId)?.name ?? (kids.length === 1 ? kids[0].name : 'your learner');

  const completedTopics = topics.filter((t) => t.completed).length;
  const avgProgress = subjects.length > 0
    ? Math.round(subjects.reduce((a, s) => a + s.progress, 0) / subjects.length)
    : 0;
  const scheduledTasks = tasks.filter((t) => t.isScheduled).length;

  /* ── Loading skeleton ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-48 bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  /* ── Error state ──────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <RefreshCw size={24} className="text-red-400" />
        </div>
        <h3 className="text-base font-bold text-gray-800 mb-2">Failed to Load Data</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5 lg:space-y-8">
      {/* ── Today Command Header ─────────────────────────────── */}
      <section className="rounded-3xl border border-gray-100 bg-white p-4 shadow-card sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-bold text-violet-700">
              <CalendarDays size={13} /> {todayLabel}
            </div>
            <h1 className="font-display text-2xl font-black leading-tight text-gray-900">{greeting()}, {user?.name ?? 'there'}</h1>
            <p className="mt-1 text-sm text-gray-500">Today plan for {selectedLearner}.</p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex">
            <button
              onClick={() => router.push('/planner')}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-violet-700"
            >
              Week Plan <ArrowRight size={13} />
            </button>
            <button
              onClick={() => router.push('/subjects')}
              className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-gray-50 px-3 text-xs font-bold text-gray-700 ring-1 ring-gray-100 transition-colors hover:bg-gray-100"
            >
              Curriculum <BookOpen size={13} />
            </button>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2">
          <TodayMetric label="Scheduled" value={todaySessions.length} icon={CalendarDays} tone="bg-violet-50 text-violet-700" />
          <TodayMetric label="Due" value={summary?.dueTodayCount ?? needsAttentionTasks.filter((t) => t.isDueToday).length} icon={Clock} tone="bg-blue-50 text-blue-700" />
          <TodayMetric label="Overdue" value={summary?.overdueCount ?? needsAttentionTasks.filter((t) => t.isOverdue).length} icon={AlertCircle} tone="bg-rose-50 text-rose-700" />
        </div>
      </section>

      {/* ── Today's Scheduled Learning ───────────────────────── */}
      <section className="rounded-3xl border border-gray-100/80 bg-white p-4 shadow-card sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-base font-bold text-gray-900">Scheduled Today</h2>
            <p className="text-xs font-medium text-gray-400">Lessons and practice selected for today.</p>
          </div>
          <button onClick={() => router.push('/planner')} className="text-xs font-bold text-accent-pink hover:opacity-80">
            Week Plan
          </button>
        </div>
        {sessionsLoading ? (
          <div className="space-y-2">
            {[...Array(2)].map((_, i) => <div key={i} className="h-36 rounded-2xl bg-gray-100 animate-pulse" />)}
          </div>
        ) : todaySessions.length > 0 ? (
          <div className="space-y-2">
            {todaySessions.map((s) => {
              const task = s.task_id ? taskById.get(s.task_id) : undefined;
              const topic = task ? topicById.get(task.topic_id) : undefined;
              const subject = topic ? subjectById.get(topic.subject_id) : undefined;
              const progress = task ? progressByTaskId.get(task.id) : undefined;
              return (
                <ScheduledTaskCard
                  key={s.id}
                  session={s}
                  task={task}
                  topic={topic}
                  subject={subject}
                  progress={progress}
                  onComplete={(id) => handleSessionAction(id, 'completed')}
                  onSkip={(id) => handleSessionAction(id, 'skipped')}
                  onReset={(id) => handleSessionAction(id, 'planned')}
                />
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-8 text-center">
            <p className="text-sm font-bold text-gray-700">No lessons scheduled for today</p>
            <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-gray-400">Create a weekly plan or choose curriculum tasks for this week.</p>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:inline-grid sm:grid-cols-2">
              <button
                onClick={handleGenerateWeekPlan}
                disabled={generatingPlan}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-violet-600 px-4 text-xs font-bold text-white disabled:opacity-60"
              >
                {generatingPlan ? <Loader2 size={14} className="animate-spin" /> : <CalendarClock size={14} />}
                Generate Week Plan
              </button>
              <button
                onClick={() => router.push('/tasks')}
                className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-white px-4 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-gray-100"
              >
                Choose Tasks
              </button>
            </div>
          </div>
        )}
      </section>

      {/* ── Due and Overdue ─────────────────────────────────── */}
      {needsAttentionTasks.length > 0 && (
        <section className="rounded-3xl border border-gray-100/80 bg-white p-4 shadow-card sm:p-5">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle size={18} className="text-accent-coral" />
            <h2 className="font-display text-base font-bold text-gray-800">Needs Attention</h2>
          </div>
          <div className="space-y-2">
            {needsAttentionTasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3">
                <Clock size={16} className={task.isOverdue ? 'text-red-500 flex-shrink-0' : 'text-amber-500 flex-shrink-0'} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800">{task.name}</p>
                  <p className="text-xs text-gray-400">{task.isOverdue ? 'Overdue' : 'Due today'}</p>
                </div>
                <button
                  onClick={() => handleMarkPracticed(task)}
                  className="min-h-9 flex-shrink-0 rounded-xl bg-accent-pink/10 px-3 text-xs font-bold text-accent-pink transition-colors hover:bg-accent-pink/20"
                >
                  Practiced
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Daily Snapshot ──────────────────────────────────── */}
      {summaryLoading ? (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 skeleton-shimmer rounded-2xl" />
          ))}
        </div>
      ) : summary ? (
        <DashboardSummaryWidgets summary={summary} />
      ) : null}

      {/* ── Stats Grid ─────────────────────────────────────────── */}
      <StaggerContainer className={`grid grid-cols-2 ${isAdmin && kids.length > 1 ? 'lg:grid-cols-3' : 'lg:grid-cols-2'} gap-4`}>
        {isAdmin && kids.length > 1 && (
          <StaggerItem>
            <StatCard label="Total Kids"   value={kids.length}       icon={Users}        iconGradient="from-violet-400 to-purple-600" sub="Enrolled learners" />
          </StaggerItem>
        )}
        <StaggerItem>
          <StatCard label="Topics Done"  value={`${completedTopics}/${topics.length}`} icon={CheckCircle2} iconGradient="from-emerald-400 to-teal-500" sub="Topics completed" />
        </StaggerItem>
        <StaggerItem>
          <StatCard label="Avg Progress" value={`${avgProgress}%`} icon={TrendingUp}   iconGradient="from-amber-400 to-orange-500" sub="Across subjects" />
        </StaggerItem>
      </StaggerContainer>

      {/* ── Content grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Subject Progress */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
          <SectionHeader title="Subject Progress" actionLabel="All Subjects" onAction={() => router.push('/subjects')} />
          {subjects.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No subjects yet. Add a child first.</p>
          ) : (
          <div className="space-y-4">
              {subjects.slice(0, 5).map((s) => (
                <ScaleOnHover key={s.id} scale={1.01}>
                <div
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors"
                  onClick={() => router.push(`/subjects/${s.id}/topics`)}
                >
                  <span className="text-xl w-8 text-center">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-gray-700 truncate">{s.name}</span>
                      <span className="text-xs font-bold text-violet-600 ml-2">{s.progress}%</span>
                    </div>
                    <ProgressBar value={s.progress} size="sm" color={s.gradient} />
                  </div>
                </div>
                </ScaleOnHover>
              ))}
            </div>
          )}
        </div>

        {/* Kids Overview / Student Stats */}
        {isAdmin && kids.length > 1 ? (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
            <SectionHeader title="Kids Overview" actionLabel="All Kids" onAction={() => router.push('/kids')} />
            {kids.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No kids added yet.</p>
            ) : (
              <div className="space-y-3">
                {kids.map((kid) => (
                  <div
                    key={kid.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors"
                    onClick={() => router.push(`/kids/${kid.id}`)}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kid.avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {kid.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-800">{kid.name}</span>
                        <span className="text-xs font-bold text-violet-600">{kid.progress.overall}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={kid.progress.overall} size="sm" className="flex-1" />
                        <span className="text-xs text-gray-400 flex-shrink-0">{kid.grade}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
            <SectionHeader title={isAdmin ? "Student Stats" : "My Stats"} />
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: GraduationCap, label: 'Subjects',   value: subjects.length,  gradient: 'from-violet-400 to-purple-500' },
                { icon: CheckCircle2,  label: 'Completed',  value: completedTopics,  gradient: 'from-emerald-400 to-teal-500' },
                { icon: ListChecks,    label: 'Topics',     value: topics.length,    gradient: 'from-blue-400 to-cyan-500' },
                { icon: Zap,           label: 'Scheduled',  value: scheduledTasks,   gradient: 'from-amber-400 to-orange-500' },
              ].map(({ icon: Icon, label, value, gradient }) => (
                <div key={label} className={`bg-gradient-to-br ${gradient} rounded-xl p-4 text-center shadow-md`}>
                  <Icon size={20} className="text-white mx-auto mb-2" />
                  <p className="text-xl font-bold text-white">{value}</p>
                  <p className="text-xs text-white/80">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Curriculum Gaps ──────────────────────────────────── */}
      {curriculumGaps.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-accent-teal" />
            <h2 className="font-display text-base font-bold text-gray-800">Curriculum Gaps</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {curriculumGaps.map((gap) => (
              <div key={gap.id} className="flex items-center gap-3 p-3 rounded-xl bg-gray-50">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-800 truncate">{gap.name}</p>
                  <p className="text-xs text-gray-400">
                    {gap.topicsCount === 0 ? 'No topics yet' : `${gap.tasksCount} task${gap.tasksCount === 1 ? '' : 's'} across ${gap.topicsCount} topic${gap.topicsCount === 1 ? '' : 's'}`}
                  </p>
                </div>
                <button
                  onClick={() => router.push(`/subjects/${gap.id}/topics?ai=1`)}
                  className="flex-shrink-0 flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-gradient-to-r from-accent-pink to-accent-coral text-white hover:opacity-90 transition-opacity"
                >
                  <Wand2 size={12} />
                  Build with AI
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Recent Tasks ─────────────────────────────────────── */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
          <SectionHeader title="Recent Tasks" actionLabel="All Activities" onAction={() => router.push('/activities')} />
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => {
              const topic = topics.find((t) => t.id === task.topicId);
              const subject = subjects.find((s) => topic && s.id === topic.subjectId);
              return (
                <div key={task.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subject?.gradient ?? 'from-gray-400 to-gray-500'} flex items-center justify-center flex-shrink-0`}>
                    <Activity size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{task.name}</p>
                    <p className="text-xs text-gray-400">
                      {subject?.emoji} {subject?.name ?? 'Unknown'} · {topic?.title ?? ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={[
                      'text-xs font-semibold px-2.5 py-1 rounded-full',
                      task.stage === 'Confident' || task.stage === 'Comfortable'
                        ? 'bg-emerald-100 text-emerald-700'
                        : task.stage === 'Not_Started'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-violet-100 text-violet-700',
                    ].join(' ')}>
                      {masteryRung(task.stage as LearningStage).label}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock size={10} />
                    <span>{task.isScheduled ? 'Scheduled' : 'Unscheduled'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty state when DB has no records ─────────────── */}
      {isEmpty && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-8 text-center">
          <div className="w-14 h-14 bg-gradient-to-br from-violet-100 to-indigo-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-3xl">🏫</div>
          <h3 className="text-base font-bold text-gray-800 mb-2">Your homeschool is empty!</h3>
          <p className="text-sm text-gray-400 mb-5 max-w-sm mx-auto">
            Add your first child, then create subjects and topics to get started.
          </p>
          <button
            onClick={() => router.push('/kids')}
            className="btn-gradient px-5 py-2.5 text-sm"
          >
            Add First Child
          </button>
        </div>
      )}
    </div>
  );
}
