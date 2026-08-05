// ============================================================
// Step 3 — Set Up Curriculum
// Two paths: AI Generate OR Assign from Existing
// ============================================================
import { Sparkles, LibraryBig, Loader2, CheckCircle2, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useAuth } from '../../../context/AuthContext';
import { useData } from '../../../context/DataContext';
import { TaskAssignmentModal } from '../../../components/curriculum/TaskAssignmentModal';
import { supabase } from '../../../services/supabase';

type Mode = 'choose' | 'ai' | 'existing';

export function StepCurriculum() {
  const { state, update, goNext, skipStep } = useOnboarding();
  const { user } = useAuth();
  const { rawSubjects } = useData();
  const hasExisting = rawSubjects.length > 0;

  const [mode, setMode]             = useState<Mode>('choose');
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState('');
  const [success, setSuccess]       = useState('');

  // AI generation fields
  const [sourceText, setSourceText] = useState('');
  const [age, setAge]               = useState(10);
  const [topicsCount, setTopicsCount] = useState(5);
  const [tasksPerTopic, setTasksPerTopic] = useState(3);

  const childId = state.selectedChildId;

  // ── AI Generate ─────────────────────────────────────────────
  async function handleAiGenerate(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceText.trim()) { setError('Please enter some curriculum text.'); return; }
    if (!childId) { setError('No child selected.'); return; }
    setError(''); setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/api/ai/generateSyllabus', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': session ? `Bearer ${session.access_token}` : '',
        },
        body: JSON.stringify({ sourceText: sourceText.trim(), age, topicsCount, tasksPerTopic, childId }),
      });
      if (!res.ok) throw new Error('Syllabus generation failed.');
      const data = await res.json();
      update({ generatedSubjectId: data.subjectId });
      setSuccess(data.message || 'Curriculum generated successfully!');
      setTimeout(goNext, 1500);
    } catch (err: any) {
      setError(err?.message ?? 'An error occurred.');
    } finally {
      setLoading(false);
    }
  }

  // ── Assign from existing ─────────────────────────────────────
  // This is now handled entirely by TaskAssignmentModal
  // ── Success state ────────────────────────────────────────────
  if (success) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center">
        <div className="w-16 h-16 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
          <CheckCircle2 size={32} className="text-emerald-500" />
        </div>
        <p className="text-base font-bold text-gray-900 mb-1">Curriculum Ready!</p>
        <p className="text-sm text-gray-500">{success}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center">
          <LibraryBig size={20} className="text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Set Up Curriculum</h2>
          <p className="text-xs text-gray-400 mt-0.5">Choose how to add subjects and topics</p>
        </div>
      </div>

      {/* Mode selector */}
      {mode === 'choose' && (
        <div className="space-y-3">
          <button
            onClick={() => setMode('ai')}
            className="w-full flex items-center gap-3 bg-gradient-to-r from-violet-50 to-indigo-50 border border-violet-200 hover:border-violet-400 rounded-2xl p-4 text-left transition-all group"
          >
            <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
              <Sparkles size={18} className="text-white" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">AI Generate</p>
              <p className="text-xs text-gray-500 mt-0.5">Paste curriculum text and let AI build a complete syllabus</p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>

          <button
            onClick={() => setMode('existing')}
            disabled={!hasExisting}
            className="w-full flex items-center gap-3 bg-gray-50 border border-gray-200 hover:border-violet-300 disabled:opacity-40 rounded-2xl p-4 text-left transition-all group"
          >
            <div className="w-10 h-10 bg-gray-200 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-violet-100 transition-colors">
              <LibraryBig size={18} className="text-gray-600 group-hover:text-violet-600 transition-colors" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold text-gray-900">Assign from Global Library</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {hasExisting
                  ? `Pick from ${rawSubjects.length} existing global & family templates`
                  : 'No templates in library yet — use AI Generate first'}
              </p>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </button>

          <button
            onClick={skipStep}
            className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
          >
            Skip for now — I'll add curriculum later
          </button>
        </div>
      )}

      {/* AI mode */}
      {mode === 'ai' && (
        <form onSubmit={handleAiGenerate} className="space-y-4">
          <button
            type="button"
            onClick={() => setMode('choose')}
            className="text-xs text-violet-600 hover:text-violet-800 font-semibold"
          >
            ← Back
          </button>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5">
              Paste Curriculum / Syllabus Text <span className="text-red-400">*</span>
            </label>
            <textarea
              rows={5}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Paste your curriculum outline, book chapters, or learning goals here…"
              className="w-full px-3 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 resize-none transition-all"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Age', value: age, set: setAge, min: 3, max: 18 },
              { label: 'Topics', value: topicsCount, set: setTopicsCount, min: 1, max: 20 },
              { label: 'Tasks/Topic', value: tasksPerTopic, set: setTasksPerTopic, min: 1, max: 10 },
            ].map(({ label, value, set, min, max }) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
                <input
                  type="number"
                  min={min} max={max}
                  value={value}
                  onChange={(e) => set(Number(e.target.value) || min)}
                  className="w-full px-2 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-1 focus:ring-violet-100 transition-all"
                />
              </div>
            ))}
          </div>
          {error && <p className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
            {loading ? 'Generating Curriculum…' : 'Generate with AI →'}
          </button>
        </form>
      )}

      {/* Existing picker mode */}
      {mode === 'existing' && (
        <div className="space-y-3">
          <button
            type="button"
            onClick={() => setMode('choose')}
            className="text-xs text-violet-600 hover:text-violet-800 font-semibold"
          >
            ← Back
          </button>
          <TaskAssignmentModal
            isOpen={true}
            onClose={() => setMode('choose')}
            defaultChildId={childId!}
            inline={true}
            onAssigned={(res) => {
              update({ assignedTasksCount: res.assigned });
              setSuccess(`Assigned ${res.assigned} task${res.assigned !== 1 ? 's' : ''}!`);
              setTimeout(goNext, 1500);
            }}
          />
        </div>
      )}
    </div>
  );
}
