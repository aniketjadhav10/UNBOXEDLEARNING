// ============================================================
// PlannerPage — this week's scheduled sessions per child.
// Reads scheduled_sessions (scheduleService) and lets a parent
// mark each session completed / skipped.
// ============================================================
import { CalendarClock, CalendarDays, Check, Loader2, RotateCcw, Sparkles, SkipForward, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useToast } from '../../store/useToastStore';
import { fetchSessions, updateSessionStatus, type ScheduledSessionView } from '../../services/scheduleService';
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

const STATUS_STYLE: Record<SessionStatus, string> = {
  planned:     'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed:   'bg-emerald-100 text-emerald-700',
  skipped:     'bg-amber-100 text-amber-700',
};

export function PlannerPage() {
  useDocumentTitle('Weekly Planner');
  const { kids } = useData();
  const { selectedChildId } = useSettingsStore();
  const childId = selectedChildId || kids?.[0]?.id || '';
  const toast = useToast();

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
      toast.error(err instanceof Error ? err.message : 'Failed to preview weekly plan.');
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
      toast.success(data.message || 'Weekly plan created!');
      setPreview(null);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate weekly plan.');
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
            <h2 className="font-display text-xl font-bold text-gray-900">Weekly Planner</h2>
            <p className="text-sm text-gray-400">Week of {iso(weekStart)}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handlePreview}
            disabled={previewing || generating}
            className="flex items-center justify-center gap-2 px-3.5 py-2.5 text-sm font-semibold text-accent-pink rounded-xl border border-accent-pink/30 bg-accent-pink/5 hover:bg-accent-pink/10 transition-colors disabled:opacity-60"
          >
            {previewing ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
            Preview with AI
          </button>
          <button
            onClick={handleGenerate}
            disabled={generating || previewing}
            className="flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold text-white rounded-xl bg-gradient-to-r from-accent-pink to-accent-coral hover:opacity-90 transition-opacity disabled:opacity-60 shadow-md"
          >
            {generating ? <Loader2 size={15} className="animate-spin" /> : <CalendarClock size={15} />}
            {generating ? 'Generating…' : sessions.length === 0 ? 'Generate this week’s plan' : 'Regenerate this week’s plan'}
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
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400 text-sm">
          No sessions scheduled this week yet. Click <span className="font-semibold text-gray-600">&quot;Generate this week&apos;s plan&quot;</span> above to build one from your child&apos;s roadmap (due reviews + recommended-next skills).
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
              {items.map((s) => (
                <div key={s.id} className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-semibold truncate ${s.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {s.label}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1">
                      {s.kind === 'skill' && s.notes === 'review' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">🔁 Review</span>
                      )}
                      {s.kind === 'skill' && s.notes === 'new' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-lime-100 text-lime-700">🌱 New skill</span>
                      )}
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${STATUS_STYLE[s.status]}`}>
                        {s.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {s.status !== 'completed' && (
                      <button onClick={() => setStatus(s.id, 'completed')} title="Mark completed"
                        className="p-2 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors">
                        <Check size={18} />
                      </button>
                    )}
                    {s.status === 'planned' && (
                      <button onClick={() => setStatus(s.id, 'skipped')} title="Skip"
                        className="p-2 rounded-lg text-amber-600 hover:bg-amber-50 transition-colors">
                        <SkipForward size={18} />
                      </button>
                    )}
                    {s.status !== 'planned' && (
                      <button onClick={() => setStatus(s.id, 'planned')} title="Reset to planned"
                        className="p-2 rounded-lg text-gray-400 hover:bg-gray-50 transition-colors">
                        <RotateCcw size={18} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
