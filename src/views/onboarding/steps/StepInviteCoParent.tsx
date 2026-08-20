// ============================================================
// Step 4 — Invite Co-parent (optional / skippable)
// ============================================================
import { Users, Mail, Loader2, CheckCircle2, Copy } from 'lucide-react';
import { useState } from 'react';
import { useOnboarding } from '../../../context/OnboardingContext';
import { inviteCoParent } from '../../../services/onboardingService';

export function StepInviteCoParent() {
  const { update, goNext, skipStep } = useOnboarding();
  const [email, setEmail]     = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [copied, setCopied]   = useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !trimmed.includes('@')) { setError('Please enter a valid email address.'); return; }
    setError(''); setLoading(true);
    try {
      const result = await inviteCoParent(trimmed);
      update({ coParentEmail: trimmed });
      if (result.code) setInviteCode(result.code);
    } catch (err: any) {
      setError(err?.message ?? 'Failed to send invite.');
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    await navigator.clipboard.writeText(inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Invite sent — show the code
  if (inviteCode) {
    return (
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <CheckCircle2 size={20} className="text-emerald-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-900">Invite Sent!</h2>
            <p className="text-xs text-gray-400 mt-0.5">Share this code with your co-parent</p>
          </div>
        </div>

        <div className="bg-violet-50 border border-violet-100 rounded-2xl p-4 text-center space-y-2">
          <p className="text-xs font-semibold text-violet-500 uppercase tracking-widest">Invite Code</p>
          <p className="text-3xl font-black text-violet-700 tracking-widest">{inviteCode}</p>
          <button
            onClick={copyCode}
            className="flex items-center gap-1.5 mx-auto text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
          >
            <Copy size={12} />
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>

        <p className="text-xs text-gray-500 text-center leading-relaxed">
          Your co-parent can enter this code on the <strong>Family</strong> page after signing up to join your workspace.
        </p>

        <button
          onClick={goNext}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl transition-all shadow-sm active:scale-95 text-sm"
        >
          Continue →
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-violet-100 rounded-2xl flex items-center justify-center">
          <Users size={20} className="text-violet-600" />
        </div>
        <div>
          <h2 className="text-xl font-black text-gray-900">Invite a Co-parent</h2>
          <p className="text-xs text-gray-400 mt-0.5">Optional — you can invite them later from Family settings</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-3">
        <p className="text-xs text-amber-700 leading-relaxed">
          Your co-parent will receive an invite code by email and can join your family workspace after signing up.
        </p>
      </div>

      <form onSubmit={handleInvite} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1.5">
            Co-parent Email Address
          </label>
          <div className="relative">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="partner@example.com"
              autoFocus
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>
          {error && (
            <p className="text-xs font-semibold text-red-500 bg-red-50 rounded-lg px-3 py-2 mt-2">{error}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all shadow-sm"
        >
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Mail size={16} />}
          {loading ? 'Sending Invite…' : 'Send Invite'}
        </button>
      </form>

      <button
        onClick={skipStep}
        className="w-full py-2 text-xs font-semibold text-gray-400 hover:text-gray-600 transition-colors"
      >
        Skip — I'll invite them later
      </button>
    </div>
  );
}
