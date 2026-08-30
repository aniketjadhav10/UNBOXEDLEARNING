// ============================================================
// PlannerPage — this week's scheduled sessions per child.
// Reads scheduled_sessions (scheduleService) and lets a parent
// mark each session completed / skipped.
// ============================================================
import { ArrowRight, BookOpen, CalendarClock, CalendarDays, Check, Loader2, Sparkles, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../store/useToastStore';
import { fetchSessions, updateSessionStatus, type ScheduledSessionView } from '../../services/scheduleService';
import { ScheduledTaskCard } from '../../components/tasks/ScheduledTaskCard';
import type { SessionStatus } from '../../types/database';

function mondayOf(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay(); // 0=Sun … 6=Sat
  date.setDate(date.getDate() + (day === 0 ? -6 : 1 - day));
  date.setHours(0, 0, 0, 0);
  return date;
}
const iso = (d: Date) => d.toISOString().split('T')[0];
const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

interface PreviewItem { name: string; kind: string; day_offset?: number; rationale?: string; }
interface PreviewResult { child: string; scheduled: number; generationMethod?: 'rules' | 'ai'; items?: PreviewItem[]; }

export function PlannerPage() {
  useDocumentTitle('Week Plan');
  const { kids, rawSubjects, rawTopics, rawTasks, taskProgress } = useData();
  const { selectedChildId } = useSettingsStore();
  const childId = selectedChildId || kids?.[0]?.id || '';
  const toast = useToast();
  const router = useRouter();

  const [sessions, setSessions] = useState<ScheduledSessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [previewing, setPreviewing] = useState(false);
  const [preview, setPreview] = useState<PreviewResult[] | null>(null);

  const weekStart = useMemo(() => mondayOf(new Date()), []);
  const days = useMemo(() => Array.from({ length: 5 }, (_, i) => addDays(weekStart, i)), [weekStart]);

  const load = useCallback(async () => {
    if (!childId) { setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const range = { from: iso(weekStart), to: iso(addDays(weekStart, 6)) };
      setSessions(await fetchSessions(childId, range));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plan');
    } finally {
      setLoading(false);
    }
  }, [childId, weekStart]);

  useEffect(() => { load(); }, [load]);

  async function handlePreview() {
    setPreviewing(true);
    try {
      const res = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to preview plan.');
      setPreview(data.results ?? []);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to preview week plan.');
    } finally {
      setPreviewing(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    try {
      const res = await fetch('/api/planner/generate', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate plan.');
      toast.success(data.message || 'Week plan created!');
      setPreview(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate week plan.');
    } finally {
      setGenerating(false);
    }
  }

  async function setStatus(id: string, status: SessionStatus) {
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, status } : s)));
    try { await updateSessionStatus(id, status); } catch { load(); }
  }

  const byDate = useMemo(() => {
    const m: Record<string, ScheduledSessionView[]> = {};
    sessions.forEach((s) => { (m[s.scheduled_date] ??= []).push(s); });
    return m;
  }, [sessions]);

  const taskById = useMemo(() => new Map(rawTasks.map((task) => [task.id, task])), [rawTasks]);
  const topicById = useMemo(() => new Map(rawTopics.map((topic) => [topic.id, topic])), [rawTopics]);
  const subjectById = useMemo(() => new Map(rawSubjects.map((subject) => [subject.id, subject])), [rawSubjects]);
  const progressByTaskId = useMemo(
    () => new Map(taskProgress.filter((p) => p.child_id === childId).map((p) => [p.task_id, p])),
    [childId, taskProgress],
  );

  if (loading) return (
    <div className="space-y-4 animate-fade-in pb-24">
      {[...Array(5)].map((_, i) => <div key={i} className="h-24 rounded-2xl bg-gray-100 animate-pulse" />)}
    </div>
  );

  if (error) return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <p className="text-sm text-red-400 mb-3">{error}</p>
      <button onClick={load} className="px-5 py-2.5 bg-gradient-to-r from-accent-pink to-accent-coral text-white text-sm font-semibold rounded-xl hover:opacity-90 transition-opacity">
        Try Again
      </button>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in pb-24 font-body">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <CalendarDays className="text-accent-pink" size={22} />
          <div>
            <h2 className="font-display text-xl font-bold text-gray-900">Week Plan</h2>
            <p className="text-sm text-gray-400">Week of {iso(weekStart)}</p>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex sm:items-center">
          <button
            onClick={() => router.push('/tasks')}
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-white px-3 text-xs font-bold text-gray-700 shadow-sm ring-1 ring-gray-100 transition-colors hover:bg-gray-50 sm:text-sm"
          >
            <BookOpen size={15} />
            Choose Tasks
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || previewing}
            className="flex min-h-10 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-accent-pink to-accent-coral px-3 text-xs font-bold text-white shadow-md transition-opacity hover:opacity-90 disabled:opacity-60 sm:text-sm"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />}
            {generating ? 'Generating…' : sessions.length === 0 ? 'Generate Plan' : 'Regenerate'}
          </button>
        </div>
      </div>

      {preview && (
        <div className="rounded-2xl border border-accent-pink/20 bg-accent-pink/5 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-accent-pink" />
              <h3 className="font-display text-sm font-bold text-gray-900">AI-proposed plan (not saved yet)</h3>
            </div>
            <button onClick={() => setPreview(null)} aria-label="Dismiss preview" className="p-1 text-gray-400 hover:text-gray-700 rounded-lg">
              <X size={16} />
            </button>
          </div>
          {preview.length === 0 || preview.every((p) => (p.items?.length ?? 0) === 0) ? (
            <p className="text-sm text-gray-500">No skills were ready to schedule for any child.</p>
          ) : (
            <div className="space-y-3">
              {preview.map((p) => (
                (p.items?.length ?? 0) > 0 && (
                  <div key={p.child}>
                    <p className="text-xs font-bold text-gray-700 mb-1.5">
                      {p.child} {p.generationMethod === 'ai' && <span className="ml-1 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-accent-pink/15 text-accent-pink">AI-arranged</span>}
                    </p>
                    <ul className="space-y-1.5">
                      {p.items!.map((it, i) => (
                        <li key={i} className="text-sm text-gray-600 flex flex-col">
                          <span>
                            {it.kind === 'review' ? '🔁' : '🌱'} <span className="font-semibold text-gray-800">{it.name}</span>
                            {typeof it.day_offset === 'number' && (
                              <span className="text-gray-400"> — {days[it.day_offset]?.toLocaleDateString(undefined, { weekday: 'long' }) ?? ''}</span>
                            )}
                          </span>
                          {it.rationale && <span className="text-xs text-gray-400 italic">{it.rationale}</span>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )
              ))}
              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full mt-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-accent-pink to-accent-coral hover:opacity-90 transition-opacity disabled:opacity-60"
              >
                {generating ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />}
                Confirm & schedule this plan
              </button>
            </div>
          )}
        </div>
      )}

      {sessions.length === 0 && !preview && (
        <div className="rounded-3xl border border-dashed border-violet-200 bg-white p-5 text-center shadow-sm">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-violet-50 text-violet-700">
            <CalendarClock size={22} />
          </div>
          <h3 className="font-display text-base font-bold text-gray-900">Start this week</h3>
          <p className="mx-auto mt-1 max-w-sm text-sm leading-relaxed text-gray-500">Generate a plan from the roadmap or choose specific tasks and mark them for this week.</p>
          <div className="mt-4 grid grid-cols-1 gap-2 sm:mx-auto sm:max-w-md sm:grid-cols-2">
            <button
              onClick={handleGenerate}
              disabled={generating || previewing}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 text-sm font-bold text-white disabled:opacity-60"
            >
              {generating ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
              Generate Plan
            </button>
            <button
              onClick={() => router.push('/tasks')}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 text-sm font-bold text-gray-700 ring-1 ring-gray-100"
            >
              Choose Tasks <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {days.map((day) => {
        const key = iso(day);
        const items = byDate[key] ?? [];
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <h3 className="font-display text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
              {day.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' })}
            </h3>
            <div className="space-y-2">
              {items.map((s) => {
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
                    onComplete={(id) => setStatus(id, 'completed')}
                    onSkip={(id) => setStatus(id, 'skipped')}
                    onReset={(id) => setStatus(id, 'planned')}
                  />
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
