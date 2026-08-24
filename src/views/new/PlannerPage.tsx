// ============================================================
// PlannerPage — this week's scheduled sessions per child.
// Reads scheduled_sessions (scheduleService) and lets a parent
// mark each session completed / skipped.
// ============================================================
import { CalendarDays, Check, RotateCcw, SkipForward } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
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

  const [sessions, setSessions] = useState<ScheduledSessionView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      <button onClick={load} className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors">
        Try Again
      </button>
    </div>
  );

  return (
    <div className="space-y-5 animate-fade-in pb-24">
      <div className="flex items-center gap-2">
        <CalendarDays className="text-violet-600" size={22} />
        <div>
          <h2 className="text-xl font-bold text-gray-900">Weekly Planner</h2>
          <p className="text-sm text-gray-400">Week of {iso(weekStart)}</p>
        </div>
      </div>

      {sessions.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center text-gray-400 text-sm">
          No sessions scheduled this week. The weekly planner generates these automatically, or add them from a task.
        </div>
      )}

      {days.map((day) => {
        const key = iso(day);
        const items = byDate[key] ?? [];
        if (items.length === 0) return null;
        return (
          <div key={key}>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400 mb-2">
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
