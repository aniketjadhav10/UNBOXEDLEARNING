// ============================================================
// LibraryBuilderPage — one-click builder for the shared 3–6 curriculum.
// Streams progress from /api/ai/generate-global-library and shows each subject
// as it's generated into the global library. Families then enroll from /library.
// ============================================================
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LibraryBig, Loader2, CheckCircle2, AlertCircle, Sparkles, Globe } from 'lucide-react';
import { supabase } from '../../services/supabase';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';

type RowStatus = 'pending' | 'running' | 'done' | 'error';
interface Row { name: string; status: RowStatus; detail?: string }

export function LibraryBuilderPage() {
  useDocumentTitle('Build 3–6 Library');
  const router = useRouter();

  const [running, setRunning] = useState(false);
  const [from, setFrom] = useState(0);
  const [rows, setRows] = useState<Row[]>([]);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function upsertRow(index: number, name: string, patch: Partial<Row>) {
    setRows((prev) => {
      const next = [...prev];
      const existing: Row = next[index] ?? { name, status: 'running' };
      next[index] = { ...existing, name, ...patch };
      return next;
    });
  }

  async function build() {
    setRunning(true);
    setRows([]);
    setSummary(null);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/generate-global-library', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({ from }),
      });
      if (!res.ok || !res.body) {
        const msg = await res.text().catch(() => '');
        throw new Error(msg || `Request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;
      while (!done) {
        const { value, done: rdDone } = await reader.read();
        done = rdDone;
        if (!value) continue;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf('\n\n')) >= 0) {
          const chunk = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          if (!chunk.startsWith('data: ')) continue;
          const evt = JSON.parse(chunk.slice(6));
          handleEvent(evt);
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Build failed');
    } finally {
      setRunning(false);
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function handleEvent(evt: any) {
    switch (evt.status) {
      case 'start':
        setRows(Array.from({ length: evt.total }, () => ({ name: '…', status: 'pending' as RowStatus })));
        break;
      case 'subject_start':
        upsertRow(evt.index, evt.name, { status: 'running' });
        break;
      case 'subject_done': {
        const s = evt.summary?.skills;
        const detail = s ? `${s.created} new skill(s), ${(evt.summary.tasks?.created ?? 0)} task(s)` : 'saved';
        upsertRow(evt.index, evt.name, { status: 'done', detail });
        break;
      }
      case 'subject_error':
        upsertRow(evt.index, evt.name, { status: 'error', detail: evt.message });
        break;
      case 'complete':
        setSummary(evt.message || `Built ${evt.built}/${evt.total} subjects.`);
        break;
      case 'error':
        setError(evt.message || 'Batch failed');
        break;
    }
  }

  const doneCount = rows.filter((r) => r.status === 'done').length;

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg">
          <LibraryBig size={24} className="text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Build the 3–6 Shared Library</h1>
          <p className="text-sm text-gray-500">Generates a complete whole-child curriculum into the global library.</p>
        </div>
      </div>

      <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-sm text-violet-800 flex gap-2">
        <Globe size={18} className="flex-shrink-0 mt-0.5" />
        <span>
          Creates ~16 subjects across all 7 development domains as a laddered skill tree (basic → advanced).
          Every family can then enroll from <button onClick={() => router.push('/library')} className="underline font-semibold">the Library</button>,
          and each child starts where their prerequisites allow. Safe to re-run — existing content is merged, not duplicated.
          <span className="block mt-1 text-violet-600">This makes many AI calls and can take several minutes. Keep this tab open.</span>
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm">
        <label className="text-gray-600 font-medium">Start at subject #</label>
        <input
          type="number"
          min={0}
          value={from}
          onChange={(e) => setFrom(Math.max(0, parseInt(e.target.value) || 0))}
          disabled={running}
          className="w-20 px-3 py-1.5 border border-gray-200 rounded-lg bg-gray-50 text-gray-900"
        />
        <span className="text-gray-400 text-xs">skip already-built subjects (e.g. 16 to build only the new holistic wave)</span>
      </div>

      <button
        onClick={build}
        disabled={running}
        className="w-full py-4 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-xl shadow-md disabled:opacity-60 flex items-center justify-center gap-2"
      >
        {running ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
        {running ? `Building… ${doneCount}/${rows.length || '…'}` : 'Build shared library'}
      </button>

      {error && (
        <div className="flex items-center gap-2 text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {summary && (
        <div className="flex items-center justify-between gap-2 text-emerald-800 bg-emerald-50 border border-emerald-100 rounded-xl px-4 py-3 text-sm">
          <span className="flex items-center gap-2"><CheckCircle2 size={16} /> {summary}</span>
          <button onClick={() => router.push('/library')} className="font-bold underline">Open Library →</button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-2">
          {rows.map((r, i) => (
            <div key={i} className="flex items-center gap-3 bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3">
              <div className="w-6 flex-shrink-0">
                {r.status === 'done' && <CheckCircle2 size={18} className="text-emerald-500" />}
                {r.status === 'running' && <Loader2 size={18} className="text-violet-500 animate-spin" />}
                {r.status === 'error' && <AlertCircle size={18} className="text-rose-500" />}
                {r.status === 'pending' && <div className="w-2 h-2 rounded-full bg-gray-200 mx-auto" />}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold truncate ${r.status === 'pending' ? 'text-gray-400' : 'text-gray-900'}`}>{r.name}</p>
                {r.detail && <p className={`text-xs truncate ${r.status === 'error' ? 'text-rose-500' : 'text-gray-400'}`}>{r.detail}</p>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
