// ============================================================
// Step 1 — Create Family Workspace
// ============================================================
import { Home, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { ensureFamily } from '../../../services/onboardingService';

export function StepCreateFamily() {
  const { state, update, goNext } = useOnboarding();
  const [name, setName] = useState(state.familyName || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) { setError('Please enter a family name.'); return; }
    setError('');
    setLoading(true);
    try {
      const familyId = await ensureFamily(trimmed);
      update({ familyId, familyName: trimmed });
      goNext();
    } catch (err: any) {
      setError(err?.message ?? 'Failed to create family workspace. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center">
          <Home size={20} className="text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Create Your Family Workspace</h2>
          <p className="text-xs text-gray-400 mt-0.5">This is the shared space for your whole family</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Family Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. The Johnson Family"
            autoFocus
            className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
          />
          {error && (
            <p className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-2">{error}</p>
          )}
        </div>

        <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
          <p className="text-xs font-semibold text-violet-700 mb-0.5">What is a Family Workspace?</p>
          <p className="text-xs text-violet-600 leading-relaxed">
            Your workspace groups all your children, subjects, and curriculum data together.
            You can invite a co-parent later to share access.
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : null}
          {loading ? 'Creating Workspace…' : 'Create Family Workspace →'}
        </button>
      </form>
    </div>
  );
}
