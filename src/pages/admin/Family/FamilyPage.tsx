import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Button }     from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { InputField } from '../../../components/ui/InputField';
import { Loader }     from '../../../components/ui/Loader';
import { Toast }      from '../../../components/ui/Toast';
import {
  createFamily,
  getMyProfile,
  listFamilyMembers,
  listFamilyInvitations,
  sendFamilyInvite,
  joinFamilyWithCode,
  type FamilyMember,
  type FamilyInvitation,
  type ProfileWithFamily,
} from '../../../services/familyService';
import { useAdminStore } from '../../../store/useAdminStore';
import { User, Mail, Shield, Plus, Copy, Check, Clock, Sparkles, UserPlus, Key } from 'lucide-react';

export function FamilyPage() {
  const [profile, setProfile] = useState<ProfileWithFamily | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [invitations, setInvitations] = useState<FamilyInvitation[]>([]);
  
  // Non-member form states
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  
  // Invite modal states
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [devModeCode, setDevModeCode] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const { loading, setLoading, showToast } = useAdminStore();

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const nextProfile = await getMyProfile();
      setProfile(nextProfile);
      setFamilyName(nextProfile.families?.name ?? '');
      if (nextProfile.family_id) {
        const [membersList, invitesList] = await Promise.all([
          listFamilyMembers(),
          listFamilyInvitations().catch(() => [] as FamilyInvitation[]), // Fallback if RPC not fully deployed yet
        ]);
        setMembers(membersList);
        setInvitations(invitesList);
      }
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to load family', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setLoading, showToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  async function handleCreateFamily(event: FormEvent) {
    event.preventDefault();
    if (!familyName.trim()) return;

    setLoading(true);
    try {
      await createFamily(familyName.trim());
      showToast({ message: 'Family workspace created successfully!', type: 'success' });
      await loadProfile();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to create family', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleJoinFamily(event: FormEvent) {
    event.preventDefault();
    if (!joinCode.trim()) return;

    setLoading(true);
    try {
      const result = await joinFamilyWithCode(joinCode.trim());
      showToast({ message: `Successfully joined the ${result.family_name} workspace!`, type: 'success' });
      await loadProfile();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to join family. Verify the code.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleSendInvite(event: FormEvent) {
    event.preventDefault();
    if (!inviteEmail.trim()) return;

    setLoading(true);
    try {
      const response = await sendFamilyInvite(inviteEmail.trim());
      
      if (response.success) {
        if (response.emailSent) {
          showToast({ message: `Invitation email sent to ${inviteEmail}`, type: 'success' });
          setIsInviteModalOpen(false);
          setInviteEmail('');
        } else {
          // SMTP not configured - Local Dev Mode
          showToast({ message: 'Invitation registered in database (Local Dev Mode)', type: 'success' });
          setDevModeCode(response.code);
        }
        
        // Refresh invites list
        const invitesList = await listFamilyInvitations().catch(() => []);
        setInvitations(invitesList);
      }
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to send invitation', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    showToast({ message: 'Code copied to clipboard!', type: 'success' });
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const getAvatarColor = (role: string, index: number) => {
    if (role === 'owner') return 'from-violet-500 to-indigo-600';
    const colors = [
      'from-pink-500 to-rose-500',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-sky-500 to-blue-600',
    ];
    return colors[index % colors.length];
  };

  if (loading && !profile) return <Loader />;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Family Settings</h1>
        <p className="mt-1 text-sm text-ink/65">
          Manage your secure family workspace, invite educational partners, and coordinate learning spaces.
        </p>
      </div>

      {profile?.families ? (
        /* ==================== ACTIVE FAMILY DASHBOARD ==================== */
        <div className="space-y-6">
          
          {/* Stunning Workspace Banner */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-600 p-6 text-white shadow-xl border border-violet-500/20">
            {/* Visual Glassmorphic Elements */}
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-48 w-48 rounded-full bg-white/10 blur-2xl" />
            <div className="absolute left-1/3 bottom-0 -mb-16 h-36 w-36 rounded-full bg-purple-500/20 blur-xl" />
            
            <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-semibold text-violet-100 backdrop-blur-sm">
                  <Sparkles size={12} className="text-violet-200" />
                  Active Workspace
                </span>
                <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">{profile.families.name}</h2>
                <p className="mt-1 text-sm text-violet-100/80">
                  Children profiles, subjects, topics, and tasks are shared inside this workspace.
                </p>
              </div>
              <button
                onClick={() => {
                  setDevModeCode(null);
                  setIsInviteModalOpen(true);
                }}
                className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-sm font-bold text-violet-700 shadow-md hover:bg-violet-50 hover:shadow-lg transition-all duration-200 active:scale-95 self-start md:self-center"
              >
                <Plus size={16} />
                Add Family Member
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* 1. Family Members Section */}
            <section className="lg:col-span-2 space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-black/5">
              <div>
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <User size={18} className="text-violet-600" />
                  Parents & Educators
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  Members with administrative access to kids, schedules, and lesson plans.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {members.map((member, index) => {
                  const name = member.display_name || member.member_email.split('@')[0];
                  const initials = name.slice(0, 2).toUpperCase();
                  
                  return (
                    <article 
                      key={member.member_id} 
                      className="group flex items-start gap-3 rounded-xl border border-black/5 p-3 hover:bg-violet-50/20 hover:border-violet-100 transition-all duration-200"
                    >
                      {/* Colored Initials Avatar */}
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getAvatarColor(member.member_role, index)} flex items-center justify-center text-white text-sm font-bold shadow-sm transition-transform duration-300 group-hover:scale-105`}>
                        {initials}
                      </div>
                      
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <p className="font-semibold text-sm text-ink truncate">
                            {member.display_name || 'Homeschool Parent'}
                          </p>
                          {member.member_role === 'owner' && (
                            <span 
                              title="Workspace Creator"
                              className="rounded-full bg-violet-100 p-0.5 text-violet-600"
                            >
                              <Shield size={10} />
                            </span>
                          )}
                        </div>
                        
                        <p className="text-xs text-ink/65 truncate flex items-center gap-1 mt-0.5">
                          <Mail size={12} className="opacity-60" />
                          {member.member_email}
                        </p>
                        
                        <span className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider mt-2 shadow-sm border ${
                          member.member_role === 'owner' 
                            ? 'bg-violet-50 border-violet-100 text-violet-700' 
                            : 'bg-slate-50 border-slate-200 text-slate-700'
                        }`}>
                          {member.member_role === 'owner' ? 'Workspace Owner' : 'Parent / Educator'}
                        </span>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>

            {/* 2. Pending Invitations Section */}
            <section className="space-y-4 bg-white p-5 rounded-2xl shadow-sm border border-black/5">
              <div>
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <Clock size={18} className="text-pink-500" />
                  Pending Invites
                </h3>
                <p className="text-xs text-ink/60 mt-0.5">
                  Invitation codes waiting to be claimed by new family members.
                </p>
              </div>

              {invitations.filter(inv => !inv.is_used).length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center p-4 border border-dashed border-black/10 rounded-xl">
                  <p className="text-xs text-ink/50 font-medium">No pending invitations</p>
                  <p className="text-[10px] text-ink/40 mt-1 max-w-[180px]">
                    Share this workspace with educational partners to coordinate lessons together.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-1">
                  {invitations.filter(inv => !inv.is_used).map((invite) => (
                    <article 
                      key={invite.id} 
                      className="rounded-xl border border-black/5 p-3 space-y-2.5 bg-pink-50/5 hover:bg-pink-50/15 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-ink truncate">{invite.email}</p>
                        <p className="text-[10px] text-ink/50 mt-0.5">
                          Sent {new Date(invite.created_at).toLocaleDateString()}
                        </p>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        {/* Copyable Join Code */}
                        <div 
                          onClick={() => handleCopyCode(invite.code)}
                          className="flex items-center gap-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-100 px-2.5 py-1 text-xs font-bold text-violet-800 font-mono cursor-pointer transition-colors"
                          title="Click to copy join code"
                        >
                          {copiedCode === invite.code ? <Check size={12} className="text-emerald-600" /> : <Copy size={11} />}
                          <span>{invite.code}</span>
                        </div>

                        <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 border border-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-600">
                          <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
                          Pending
                        </span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </section>

          </div>
        </div>
      ) : (
        /* ==================== NON-FAMILY SPLIT SCREEN (CREATE OR JOIN) ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mt-4">
          
          {/* Card A: Create a Family Workspace */}
          <section className="bg-white rounded-2xl shadow-md border border-black/5 overflow-hidden flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
            {/* Header banner */}
            <div className="bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white relative">
              <div className="absolute right-4 top-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
                <Sparkles size={72} />
              </div>
              <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                Option A
              </span>
              <h2 className="mt-3 text-xl font-bold flex items-center gap-2">
                <Sparkles size={20} className="text-violet-200" />
                Create a Family Workspace
              </h2>
              <p className="mt-1 text-xs text-violet-100/80">
                Build a private learning space to link kid profiles and build custom curriculums.
              </p>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
              <p className="text-sm text-ink/65 leading-relaxed">
                Start a secure workspace where you hold full ownership. You will be able to register children, add structured homeschool subjects, schedule learning goals, and invite another parent or educator later.
              </p>

              <form onSubmit={handleCreateFamily} className="space-y-4">
                <InputField
                  label="Family Workspace Name"
                  onChange={(event) => setFamilyName(event.target.value)}
                  placeholder="e.g. The Sharma Family"
                  required
                  value={familyName}
                  className="bg-slate-50 focus:bg-white"
                />
                <Button className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-2.5 rounded-xl hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all duration-200 active:scale-[0.98]" type="submit">
                  Create Workspace
                </Button>
              </form>
            </div>
          </section>

          {/* Card B: Join an Existing Workspace */}
          <section className="bg-white rounded-2xl shadow-md border border-black/5 overflow-hidden flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
            {/* Header banner */}
            <div className="bg-gradient-to-br from-pink-600 to-rose-700 p-6 text-white relative">
              <div className="absolute right-4 top-4 opacity-10 group-hover:scale-110 transition-transform duration-300">
                <Key size={72} />
              </div>
              <span className="inline-flex rounded-full bg-white/20 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-sm">
                Option B
              </span>
              <h2 className="mt-3 text-xl font-bold flex items-center gap-2">
                <UserPlus size={20} className="text-pink-200" />
                Join Existing Workspace
              </h2>
              <p className="mt-1 text-xs text-pink-100/80">
                Co-manage homeschool plans with your partner inside an existing family space.
              </p>
            </div>

            <div className="p-6 flex-1 flex flex-col justify-between space-y-6">
              <p className="text-sm text-ink/65 leading-relaxed">
                If your partner has already created a family workspace, enter the 6-character secure joining code sent to your email address (or shared by your partner) to immediately link your account and collaborate.
              </p>

              <form onSubmit={handleJoinFamily} className="space-y-4">
                <InputField
                  label="Enter Joining Code"
                  onChange={(event) => setJoinCode(event.target.value)}
                  placeholder="e.g. UL-A3B7D9"
                  required
                  value={joinCode}
                  className="bg-slate-50 focus:bg-white text-center font-mono font-bold uppercase tracking-wider text-base"
                />
                <Button className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold py-2.5 rounded-xl hover:from-pink-700 hover:to-rose-700 shadow-md transition-all duration-200 active:scale-[0.98]" type="submit">
                  Join Workspace
                </Button>
              </form>
            </div>
          </section>

        </div>
      )}

      {/* ==================== DIALOG MODAL: ADD FAMILY MEMBER ==================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full border border-black/5 relative animate-scale-up space-y-4">
            
            {/* Modal Header */}
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <UserPlus className="text-violet-600" size={20} />
                Invite Family Member
              </h3>
              <p className="text-xs text-ink/60 mt-1">
                Generates a secure, 7-day joining code to add another parent to your workspace.
              </p>
            </div>

            {devModeCode ? (
              /* Success alert state for local testing/dev when SMTP isn't configured */
              <div className="space-y-4 animate-fade-in">
                <div className="rounded-xl bg-violet-50 border border-violet-100 p-4 space-y-2">
                  <p className="text-xs font-semibold text-violet-800 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    Developer Mode Notice
                  </p>
                  <p className="text-xs text-violet-700/80 leading-relaxed">
                    The invitation was successfully registered in the database. Since SMTP email settings are not configured, copy the joining code below and share it with your partner manually:
                  </p>
                  
                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-lg border border-violet-200/60 shadow-sm mt-3">
                    <span className="font-mono text-xl font-extrabold tracking-wider text-violet-900">
                      {devModeCode}
                    </span>
                    <button
                      onClick={() => handleCopyCode(devModeCode)}
                      className="flex items-center gap-1.5 rounded-md bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-sm active:scale-95"
                    >
                      {copiedCode === devModeCode ? <Check size={12} /> : <Copy size={12} />}
                      {copiedCode === devModeCode ? 'Copied' : 'Copy Code'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button 
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteEmail('');
                      setDevModeCode(null);
                    }}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                  >
                    Close
                  </Button>
                </div>
              </div>
            ) : (
              /* Standard email invite form state */
              <form onSubmit={handleSendInvite} className="space-y-4">
                <InputField
                  label="Partner's Gmail Address"
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="partner@gmail.com"
                  required
                  type="email"
                  value={inviteEmail}
                  className="bg-slate-50 focus:bg-white"
                />

                <p className="text-[10px] text-ink/50 leading-relaxed">
                  <strong>Important:</strong> The invited member must sign in to UnBoxed Learning using this email address via Google Auth to claim the workspace access.
                </p>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsInviteModalOpen(false);
                      setInviteEmail('');
                    }}
                    className="px-4 py-2 border border-black/10 hover:bg-slate-50 text-ink/70 font-semibold rounded-xl text-xs transition-colors"
                  >
                    Cancel
                  </button>
                  <Button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all duration-200 active:scale-95"
                  >
                    Send Joining Code
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      <Toast />
    </div>
  );
}
