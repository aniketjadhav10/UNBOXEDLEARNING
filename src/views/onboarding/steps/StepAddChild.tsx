// ============================================================
// Step 2 — Add First Child
// ============================================================
import { User, Plus, Loader2, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useAuth } from '../../../context/AuthContext';
import { addChild } from '../../../services/onboardingService';

export function StepAddChild() {
  const { state, update, goNext } = useOnboarding();
  const { user } = useAuth();
  const [name, setName]           = useState('');
  const [grade, setGrade]         = useState('');
  const [dob, setDob]             = useState('');
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState('');

  const existingChildren = state.children;

  async function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Child name is required.'); return; }
    if (!grade.trim()) { setError('Grade level is required.'); return; }
    if (!user) { setError('You must be signed in.'); return; }
    setError('');
    setLoading(true);
    try {
      const id = await addChild(user.id, {
        name: name.trim(),
        grade_level: grade.trim(),
        date_of_birth: dob || undefined,
      });
      const newChild = { id, name: name.trim() };
      const updatedChildren = [...existingChildren, newChild];
      update({
        children: updatedChildren,
        selectedChildId: id,  // select the first child by default
      });
      setName(''); setGrade(''); setDob('');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to add child.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center">
          <User size={20} className="text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Add Your Child</h2>
          <p className="text-xs text-gray-400 mt-0.5">You can add more children after setup</p>
        </div>
      </div>

      {/* Added children list */}
      {existingChildren.length > 0 && (
        <div className="space-y-2">
          {existingChildren.map((child) => (
            <div key={child.id} className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2.5">
              <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
              <span className="text-sm font-semibold text-emerald-700 flex-1">{child.name}</span>
            </div>
          ))}
        </div>
      )}

      {/* Add child form */}
      <form onSubmit={handleAddChild} className="space-y-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">
          {existingChildren.length === 0 ? 'First Child' : 'Add Another Child'}
        </p>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">
            Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Emma"
            autoFocus
            className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">
              Grade Level <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={grade}
              onChange={(e) => setGrade(e.target.value)}
              placeholder="e.g. Grade 3"
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1">Date of Birth</label>
            <input
              type="date"
              value={dob}
              onChange={(e) => setDob(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>
        </div>

        {error && (
          <p className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-gray-800 hover:bg-gray-900 disabled:opacity-60 text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 transition-all"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
          {loading ? 'Adding…' : 'Add Child'}
        </button>
      </form>

      {existingChildren.length > 0 && (
        <button
          onClick={goNext}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 text-sm"
        >
          Continue →
        </button>
      )}
    </div>
  );
}
