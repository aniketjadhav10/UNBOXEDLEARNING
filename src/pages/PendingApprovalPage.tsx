import { useState, useEffect } from 'react';
import { Clock, LogOut, RefreshCcw, Loader2, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { joinFamilyWithCode } from '../services/familyService';
import { useToast } from '../store/useToastStore';

export function PendingApprovalPage() {
  const { signOut, user } = useAuth();
  const toast = useToast();
  
  const [inviteCode, setInviteCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  const handleJoinFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    let code = inviteCode.trim().toUpperCase();
    if (!code) {
      toast.error('Please enter your invitation code.');
      return;
    }
    
    // Automatically prepend UL- if they just typed the 6 characters
    if (code.length === 6 && !code.startsWith('UL-')) {
      code = `UL-${code}`;
    }

    if (code.length !== 9 || !code.startsWith('UL-')) {
      toast.error('Please enter a valid invitation code (e.g. UL-A1B2C3).');
      return;
    }
    
    setIsJoining(true);
    try {
      await joinFamilyWithCode(code);
      toast.success('Successfully joined the family!');
      // Force reload to refresh user profile permissions
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'Failed to join family. Invalid code.');
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] p-4">
      {/* Background decorations */}
      <div className="fixed -top-20 -left-20 w-72 h-72 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="fixed -bottom-20 -right-20 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10 flex flex-col gap-6">
        <div className="bg-white rounded-3xl shadow-2xl p-8 md:p-10 text-center relative overflow-hidden">
          <div className="w-20 h-20 bg-amber-100 text-amber-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner relative z-10">
            <Clock size={40} />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3 relative z-10">Account Pending Approval</h1>
          
          <p className="text-gray-600 mb-8 leading-relaxed relative z-10">
            Your account has been successfully created, but it is currently pending review. 
            The application owner needs to approve your registration before you can access the system.
          </p>

          {/* Invitation Code Section */}
          <div className="mb-8 p-5 bg-violet-50 rounded-2xl border border-violet-100 relative z-10">
            <h3 className="text-sm font-bold text-violet-900 mb-2 text-left flex items-center gap-2">
              <KeyRound size={16} /> Have an invitation code?
            </h3>
            <p className="text-xs text-violet-700 mb-4 text-left">
              If a family member invited you, enter the code from your email to be instantly approved.
            </p>
            <form onSubmit={handleJoinFamily} className="flex gap-2">
              <input
                type="text"
                placeholder="e.g. UL-A1B2C3"
                value={inviteCode}
                onChange={(e) => setInviteCode(e.target.value)}
                maxLength={10}
                className="flex-1 bg-white border border-violet-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-200 uppercase tracking-wider"
              />
              <button
                type="submit"
                disabled={isJoining || inviteCode.trim().length < 6}
                className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                {isJoining ? <Loader2 size={16} className="animate-spin" /> : 'Join'}
              </button>
            </form>
          </div>

          <div className="space-y-3 relative z-10">
            <button
              onClick={() => window.location.reload()}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
            >
              <RefreshCcw size={18} />
              Refresh Status
            </button>

            <button
              onClick={() => signOut()}
              className="w-full flex items-center justify-center gap-2 py-3.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-700 font-semibold rounded-xl transition-colors shadow-sm"
            >
              <LogOut size={18} />
              Sign Out
            </button>
          </div>
        </div>

        <p className="text-center text-violet-300/80 text-sm mt-8">
          UnBoxed Learning
        </p>
      </div>
    </main>
  );
}
