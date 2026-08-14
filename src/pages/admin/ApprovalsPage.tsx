import { useEffect, useState } from 'react';
import { supabase } from '../../services/supabase';
import { CheckCircle, Clock, ShieldCheck, UserCheck } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { Loader } from '../../components/ui/Loader';
import { Toast } from '../../components/ui/Toast';
import { useAdminStore } from '../../store/useAdminStore';

interface Profile {
  id: string;
  display_name: string | null;
  is_admin: boolean;
  is_approved: boolean;
  created_at: string;
}

export function ApprovalsPage() {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const { loading, setLoading, showToast } = useAdminStore();

  async function fetchProfiles() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc('get_all_profiles');
      if (error) throw error;
      setProfiles(data || []);
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Failed to fetch profiles', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProfiles();
  }, []);

  async function handleApprove(userId: string) {
    setLoading(true);
    try {
      const { error } = await supabase.rpc('approve_user', { target_user_id: userId });
      if (error) throw error;
      showToast({ message: 'User approved successfully!', type: 'success' });
      await fetchProfiles(); // refresh the list
    } catch (err) {
      showToast({ message: err instanceof Error ? err.message : 'Failed to approve user', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  if (loading && profiles.length === 0) return <Loader />;

  const pendingUsers = profiles.filter(p => !p.is_approved);
  const approvedUsers = profiles.filter(p => p.is_approved);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink flex items-center gap-2">
          <ShieldCheck className="text-violet-600" />
          User Approvals
        </h1>
        <p className="mt-1 text-sm text-ink/65">
          Manage system access by approving new registrations. Unapproved users cannot access the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Approvals */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <Clock size={18} className="text-amber-500" />
              Pending Review
              <span className="bg-amber-100 text-amber-700 text-xs py-0.5 px-2 rounded-full">
                {pendingUsers.length}
              </span>
            </h2>
          </div>

          {pendingUsers.length === 0 ? (
            <div className="h-40 flex flex-col items-center justify-center text-center p-4 border border-dashed border-black/10 rounded-xl">
              <CheckCircle className="text-emerald-400 mb-2" size={32} />
              <p className="text-sm font-medium text-ink/70">All caught up!</p>
              <p className="text-xs text-ink/50 mt-1">No users are currently pending approval.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingUsers.map(user => (
                <article key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-100 bg-amber-50/30">
                  <div>
                    <p className="font-semibold text-sm text-ink">
                      {user.display_name || 'New User'}
                    </p>
                    <p className="text-xs text-ink/60 mt-0.5 font-mono">
                      {user.id.slice(0, 8)}...
                    </p>
                    <p className="text-[10px] text-ink/40 mt-1">
                      Joined {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    onClick={() => handleApprove(user.id)}
                    className="bg-emerald-500 hover:bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5"
                  >
                    <UserCheck size={14} />
                    Approve
                  </Button>
                </article>
              ))}
            </div>
          )}
        </section>

        {/* Approved Users (Read-only list for admin visibility) */}
        <section className="bg-white rounded-2xl shadow-sm border border-black/5 p-5">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-ink flex items-center gap-2">
              <ShieldCheck size={18} className="text-emerald-500" />
              Active Users
              <span className="bg-emerald-100 text-emerald-700 text-xs py-0.5 px-2 rounded-full">
                {approvedUsers.length}
              </span>
            </h2>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto">
            {approvedUsers.map(user => (
              <article key={user.id} className="flex items-center justify-between p-3 rounded-xl border border-black/5 hover:bg-slate-50 transition-colors">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-sm text-ink">
                      {user.display_name || 'User'}
                    </p>
                    {user.is_admin && (
                      <span className="bg-violet-100 text-violet-700 text-[10px] uppercase font-bold px-1.5 py-0.5 rounded">Admin</span>
                    )}
                  </div>
                  <p className="text-xs text-ink/60 mt-0.5 font-mono">
                    {user.id.slice(0, 8)}...
                  </p>
                </div>
                <div className="text-emerald-500 flex items-center gap-1 text-xs font-semibold">
                  <CheckCircle size={14} />
                  Approved
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
      <Toast />
    </div>
  );
}
