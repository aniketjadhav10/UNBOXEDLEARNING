// ============================================================
// Step 1 — Create or Join Family Workspace
// ============================================================
import { Home, Loader2, Users, Key } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOnboarding } from '../../../context/OnboardingContext';
import { useAuth } from '../../../context/AuthContext';
import { ensureFamily } from '../../../services/onboardingService';
import { joinFamilyWithCode } from '../../../services/familyService';

export function StepCreateFamily() {
  const { state, update, goNext, markComplete } = useOnboarding();
  const { markOnboardedLocally } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  
  const [name, setName] = useState(state.familyName || '');
  const [code, setCode] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate(e: React.FormEvent) {
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
  
  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    const trimmedCode = code.trim().toUpperCase();
    if (!trimmedCode) { setError('Please enter the 6-digit joining code.'); return; }
    
    setError('');
    setLoading(true);
    try {
      const data = await joinFamilyWithCode(trimmedCode);
      update({ familyId: data.family_id, familyName: data.family_name });
      
      // If joining an existing workspace, we skip the rest of the wizard
      await markComplete();
      markOnboardedLocally();
      navigate('/');
    } catch (err: any) {
      setError(err?.message ?? 'Failed to join family workspace. Check your code and try again.');
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
          <h2 className="text-xl font-black text-gray-900">Your Family Workspace</h2>
          <p className="text-xs text-gray-400 mt-0.5">Create a new workspace or join an existing one</p>
        </div>
      </div>

      <div className="flex bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => { setActiveTab('create'); setError(''); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'create' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Create New
        </button>
        <button
          onClick={() => { setActiveTab('join'); setError(''); }}
          className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
            activeTab === 'join' ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Join Existing
        </button>
      </div>

      {error && (
        <p className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-3 py-2 animate-fade-in">{error}</p>
      )}

      {activeTab === 'create' ? (
        <form onSubmit={handleCreate} className="space-y-5 animate-fade-in">
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
          </div>

          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 flex gap-3">
            <Users size={18} className="text-violet-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-violet-700 mb-0.5">What is a Family Workspace?</p>
              <p className="text-xs text-violet-600 leading-relaxed">
                Your workspace groups all your children and subjects together. You can invite a co-parent later to share access.
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Creating Workspace…' : 'Create Workspace →'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="space-y-5 animate-fade-in">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              6-Digit Joining Code <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. UL-A1B2C"
              autoFocus
              className="w-full px-4 py-3 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all uppercase tracking-wider font-mono placeholder:normal-case placeholder:font-sans placeholder:tracking-normal"
            />
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex gap-3">
            <Key size={18} className="text-emerald-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-semibold text-emerald-700 mb-0.5">Got an invite?</p>
              <p className="text-xs text-emerald-600 leading-relaxed">
                If your partner already created a workspace, they can give you a 6-digit code. Enter it here to securely link your accounts!
              </p>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? 'Joining…' : 'Join Workspace →'}
          </button>
        </form>
      )}
    </div>
  );
}
