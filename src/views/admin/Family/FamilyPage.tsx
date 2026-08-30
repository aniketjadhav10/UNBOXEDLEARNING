import { FormEvent, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { InputField } from '../../../components/ui/InputField';
import { Loader } from '../../../components/ui/Loader';
import { Toast } from '../../../components/ui/Toast';
import { ProgressBar } from '../../../components/ui/ProgressBar';
import {
  createFamily,
  getMyProfile,
  listFamilyMembers,
  listFamilyInvitations,
  sendFamilyInvite,
  joinFamilyWithCode,
  cancelFamilyInvitation,
  removeFamilyMember,
  leaveFamily,
  type FamilyMember,
  type FamilyInvitation,
  type ProfileWithFamily,
} from '../../../services/familyService';
import { addChild } from '../../../services/onboardingService';
import { updateChild } from '../../../services/dataService';
import { useAdminStore } from '../../../store/useAdminStore';
import { useAuth } from '../../../context/AuthContext';
import { useData, type AppKid } from '../../../context/DataContext';
import { supabase } from '../../../services/supabase';
import {
  User,
  Mail,
  Shield,
  Plus,
  Copy,
  Check,
  Clock,
  Sparkles,
  UserPlus,
  Key,
  Trash2,
  LogOut,
  X,
  Baby,
  Calendar,
  Route,
  Bell,
  Settings,
  Edit3,
  BookOpen,
  GraduationCap,
  TrendingUp,
  CheckCircle2,
  ChevronRight,
  Send,
  Users,
} from 'lucide-react';

function joinCodeErrorMessage(rawMessage: string): string {
  if (rawMessage.includes('different email address')) {
    return `${rawMessage} Sign out and register or sign in with the email the invite was sent to, or ask the family owner to resend it to your email.`;
  }
  return rawMessage;
}

export function FamilyPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { kids, subjects, refresh: refreshAppData } = useData();
  const { loading, setLoading, showToast } = useAdminStore();

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

  // Add-child modal state
  const [isAddChildModalOpen, setIsAddChildModalOpen] = useState(false);
  const [childName, setChildName] = useState('');
  const [childGrade, setChildGrade] = useState('');
  const [childDob, setChildDob] = useState('');

  // Edit-child modal state
  const [isEditChildModalOpen, setIsEditChildModalOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<AppKid | null>(null);
  const [editChildName, setEditChildName] = useState('');
  const [editChildGrade, setEditChildGrade] = useState('');
  const [editChildDob, setEditChildDob] = useState('');

  // Edit-family modal state
  const [isEditFamilyModalOpen, setIsEditFamilyModalOpen] = useState(false);
  const [editFamilyNameInput, setEditFamilyNameInput] = useState('');

  // Email Digest Preferences
  const [dailyAgenda, setDailyAgenda] = useState(true);
  const [eveningProgress, setEveningProgress] = useState(true);
  const [weeklyReport, setWeeklyReport] = useState(true);
  const [savingPrefs, setSavingPrefs] = useState(false);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const nextProfile = await getMyProfile();
      setProfile(nextProfile);
      setFamilyName(nextProfile.families?.name ?? '');
      setEditFamilyNameInput(nextProfile.families?.name ?? '');

      if (nextProfile.family_id) {
        const [membersList, invitesList] = await Promise.all([
          listFamilyMembers(),
          listFamilyInvitations().catch(() => [] as FamilyInvitation[]),
        ]);
        setMembers(membersList);
        setInvitations(invitesList);
      }
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to load family',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }, [setLoading, showToast]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  // Load preferences from profile metadata or localStorage
  useEffect(() => {
    const saved = localStorage.getItem('ub_family_email_prefs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (typeof parsed.dailyAgenda === 'boolean') setDailyAgenda(parsed.dailyAgenda);
        if (typeof parsed.eveningProgress === 'boolean') setEveningProgress(parsed.eveningProgress);
        if (typeof parsed.weeklyReport === 'boolean') setWeeklyReport(parsed.weeklyReport);
      } catch (e) {
        // ignore JSON parse error
      }
    }
  }, []);

  async function handleCreateFamily(event: FormEvent) {
    event.preventDefault();
    if (!familyName.trim()) return;

    setLoading(true);
    try {
      await createFamily(familyName.trim());
      showToast({ message: 'Family workspace created successfully!', type: 'success' });
      await loadProfile();
      await refreshAppData();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to create family',
        type: 'error',
      });
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
      await refreshAppData();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to join family. Verify the code.';
      showToast({ message: joinCodeErrorMessage(message), type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateFamilyName(event: FormEvent) {
    event.preventDefault();
    if (!editFamilyNameInput.trim() || !profile?.family_id) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('families')
        .update({ name: editFamilyNameInput.trim() })
        .eq('id', profile.family_id);

      if (error) throw error;

      showToast({ message: 'Family workspace name updated!', type: 'success' });
      setIsEditFamilyModalOpen(false);
      await loadProfile();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to update family name',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleAddChild(event: FormEvent) {
    event.preventDefault();
    if (!childName.trim() || !childGrade.trim() || !user) return;

    setLoading(true);
    try {
      await addChild(user.id, {
        name: childName.trim(),
        grade_level: childGrade.trim(),
        date_of_birth: childDob || undefined,
      });
      showToast({ message: `${childName.trim()} was added successfully!`, type: 'success' });
      setChildName('');
      setChildGrade('');
      setChildDob('');
      setIsAddChildModalOpen(false);
      await refreshAppData();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to add child',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  function handleOpenEditChild(kid: AppKid) {
    setEditingKid(kid);
    setEditChildName(kid.name);
    setEditChildGrade(kid.grade);
    setEditChildDob(kid.date_of_birth || '');
    setIsEditChildModalOpen(true);
  }

  async function handleSaveEditChild(event: FormEvent) {
    event.preventDefault();
    if (!editingKid || !editChildName.trim() || !editChildGrade.trim()) return;

    setLoading(true);
    try {
      await updateChild(editingKid.id, {
        name: editChildName.trim(),
        grade_level: editChildGrade.trim(),
        date_of_birth: editChildDob || null,
      });
      showToast({ message: `${editChildName.trim()} was updated successfully!`, type: 'success' });
      setIsEditChildModalOpen(false);
      setEditingKid(null);
      await refreshAppData();
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to update child',
        type: 'error',
      });
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
        } else if (response.smtpError) {
          showToast({ message: `Email delivery notice: ${response.smtpError}`, type: 'success' });
          setDevModeCode(response.code);
        } else {
          showToast({ message: 'Invitation registered in database (Local Dev Mode)', type: 'success' });
          setDevModeCode(response.code);
        }

        const invitesList = await listFamilyInvitations().catch(() => []);
        setInvitations(invitesList);
      }
    } catch (error) {
      showToast({
        message: error instanceof Error ? error.message : 'Unable to send invitation',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelInvite(invitationId: string) {
    if (!confirm('Are you sure you want to cancel this invitation?')) return;
    setLoading(true);
    try {
      await cancelFamilyInvitation(invitationId);
      showToast({ message: 'Invitation canceled successfully', type: 'success' });
      await loadProfile();
    } catch (error: any) {
      showToast({ message: error.message || 'Unable to cancel invitation', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveMember(memberUserId: string) {
    if (!confirm('Are you sure you want to remove this member from the workspace?')) return;
    setLoading(true);
    try {
      await removeFamilyMember(memberUserId);
      showToast({ message: 'Member removed successfully', type: 'success' });
      await loadProfile();
    } catch (error: any) {
      showToast({ message: error.message || 'Unable to remove member', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function handleLeaveFamily() {
    if (
      !confirm(
        'Are you sure you want to leave this family workspace? You will lose access to all shared children and curriculums.'
      )
    )
      return;
    setLoading(true);
    try {
      await leaveFamily();
      showToast({ message: 'You have left the family workspace', type: 'success' });
      await loadProfile();
      await refreshAppData();
    } catch (error: any) {
      showToast({ message: error.message || 'Unable to leave workspace', type: 'error' });
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

  const handleSaveDigestPreferences = async () => {
    setSavingPrefs(true);
    try {
      const prefs = { dailyAgenda, eveningProgress, weeklyReport };
      localStorage.setItem('ub_family_email_prefs', JSON.stringify(prefs));

      if (user?.id) {
        await supabase
          .from('profiles')
          .update({ preferences: prefs })
          .eq('id', user.id);
      }
      showToast({ message: 'Family email preferences saved!', type: 'success' });
    } catch {
      // Preferences saved to localStorage fallback
      showToast({ message: 'Family email preferences saved!', type: 'success' });
    } finally {
      setSavingPrefs(false);
    }
  };

  const getAvatarColor = (role: string, index: number) => {
    if (role === 'owner') return 'from-violet-600 to-indigo-600';
    const colors = [
      'from-pink-500 to-rose-500',
      'from-emerald-500 to-teal-600',
      'from-amber-500 to-orange-600',
      'from-sky-500 to-blue-600',
      'from-purple-500 to-indigo-500',
    ];
    return colors[index % colors.length];
  };

  if (loading && !profile) return <Loader />;

  const currentUserMember = profile ? members.find((m) => m.member_user_id === profile.id) : null;
  const isOwner = currentUserMember?.member_role === 'owner' || profile?.families?.created_by === profile?.id;

  // Aggregate Metrics
  const totalTasksCompleted = kids.reduce((acc, k) => acc + (k.progress?.activitiesCompleted || 0), 0);
  const avgOverallProgress =
    kids.length > 0 ? Math.round(kids.reduce((acc, k) => acc + (k.progress?.overall || 0), 0) / kids.length) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 animate-fade-in">
      {/* ── Page Header ────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black text-ink tracking-tight flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-violet-100 text-violet-700">
              <Users size={22} />
            </span>
            Family & Learning Hub
          </h1>
          <p className="mt-1 text-sm text-ink/65">
            Manage your family workspace, coordinate homeschool learners, and collaborate with co-parents.
          </p>
        </div>

        {profile?.families && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsAddChildModalOpen(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95"
            >
              <Baby size={15} />
              Add Child
            </button>
            {isOwner && (
              <button
                onClick={() => {
                  setDevModeCode(null);
                  setIsInviteModalOpen(true);
                }}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-black/10 text-xs font-bold shadow-sm transition-all active:scale-95"
              >
                <UserPlus size={15} className="text-violet-600" />
                Invite Partner
              </button>
            )}
          </div>
        )}
      </div>

      {profile?.families ? (
        /* ==================== ACTIVE FAMILY DASHBOARD ==================== */
        <div className="space-y-6">
          {/* 1. Hero Workspace Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-violet-600 via-indigo-600 to-purple-700 p-6 md:p-8 text-white shadow-xl border border-violet-400/20">
            {/* Visual Glassmorphism Accents */}
            <div className="absolute right-0 top-0 -mr-16 -mt-16 h-56 w-56 rounded-full bg-white/10 blur-3xl pointer-events-none" />
            <div className="absolute left-1/3 bottom-0 -mb-20 h-44 w-44 rounded-full bg-purple-400/20 blur-2xl pointer-events-none" />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold text-violet-100 backdrop-blur-md border border-white/15">
                    <Sparkles size={12} className="text-amber-300" />
                    Homeschool Workspace
                  </span>
                  {isOwner && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-400/20 border border-amber-300/30 px-2.5 py-0.5 text-[11px] font-bold text-amber-200">
                      <Shield size={11} /> Workspace Owner
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <h2 className="text-2xl md:text-3xl font-extrabold tracking-tight">{profile.families.name}</h2>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setEditFamilyNameInput(profile.families?.name || '');
                        setIsEditFamilyModalOpen(true);
                      }}
                      title="Edit Workspace Name"
                      className="p-1.5 rounded-lg bg-white/15 hover:bg-white/25 text-white/90 transition-colors"
                    >
                      <Edit3 size={15} />
                    </button>
                  )}
                </div>

                <p className="text-xs md:text-sm text-violet-100/85 leading-relaxed">
                  Central hub for lesson plans, child learning roadmaps, co-parent collaboration, and automated progress reports.
                </p>
              </div>

              {/* Quick Actions & Workspace Status */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => router.push('/planner')}
                  className="flex items-center gap-2 rounded-xl bg-white text-violet-800 px-4 py-2.5 text-xs font-bold shadow-md hover:bg-violet-50 transition-all active:scale-95"
                >
                  <Calendar size={15} className="text-violet-600" />
                  Family Planner
                </button>
                <button
                  onClick={() => router.push('/roadmap')}
                  className="flex items-center gap-2 rounded-xl bg-white/20 hover:bg-white/30 text-white backdrop-blur-md px-4 py-2.5 text-xs font-bold border border-white/25 shadow-md transition-all active:scale-95"
                >
                  <Route size={15} />
                  Roadmaps
                </button>
                {!isOwner && (
                  <button
                    onClick={handleLeaveFamily}
                    className="flex items-center gap-1.5 rounded-xl bg-rose-500/80 hover:bg-rose-600 text-white px-3.5 py-2.5 text-xs font-bold border border-rose-400/40 shadow-sm transition-all active:scale-95"
                  >
                    <LogOut size={14} />
                    Leave
                  </button>
                )}
              </div>
            </div>

            {/* Metric Ribbon */}
            <div className="mt-6 pt-5 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                <p className="text-[11px] font-medium text-violet-200">Registered Learners</p>
                <p className="text-xl md:text-2xl font-black text-white mt-0.5">{kids.length}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                <p className="text-[11px] font-medium text-violet-200">Parents & Educators</p>
                <p className="text-xl md:text-2xl font-black text-white mt-0.5">{members.length || 1}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                <p className="text-[11px] font-medium text-violet-200">Tasks Completed</p>
                <p className="text-xl md:text-2xl font-black text-white mt-0.5">{totalTasksCompleted}</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10">
                <p className="text-[11px] font-medium text-violet-200">Avg Overall Progress</p>
                <p className="text-xl md:text-2xl font-black text-white mt-0.5">{avgOverallProgress}%</p>
              </div>
            </div>
          </div>

          {/* ── Main Two-Column Layout ───────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* ── LEFT COLUMN: Children & Learners Hub (2 cols) ───── */}
            <div className="lg:col-span-2 space-y-6">
              {/* Section Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                    <Baby className="text-violet-600" size={20} />
                    Learners & Children Profiles
                  </h3>
                  <p className="text-xs text-ink/60 mt-0.5">
                    Individual roadmaps, curriculum enrollments, and week plans.
                  </p>
                </div>
                <button
                  onClick={() => setIsAddChildModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs font-bold text-violet-700 bg-violet-50 hover:bg-violet-100 border border-violet-200 px-3 py-1.5 rounded-xl transition-colors"
                >
                  <Plus size={14} />
                  Add Learner
                </button>
              </div>

              {/* Children Grid */}
              {kids.length === 0 ? (
                <div className="bg-white rounded-3xl p-8 border border-black/5 shadow-sm text-center">
                  <EmptyState
                    icon={Baby}
                    title="No children registered yet"
                    description="Add your first homeschool learner to link personalized subjects, topics, and lesson schedules."
                    actionLabel="Add Child Profile"
                    onAction={() => setIsAddChildModalOpen(true)}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {kids.map((kid) => {
                    const enrolledSubjects = subjects.filter((s) => s.childId === kid.id || !s.childId);

                    return (
                      <div
                        key={kid.id}
                        className="group bg-white rounded-3xl border border-black/5 p-5 shadow-sm hover:shadow-md transition-all duration-300 space-y-4 hover:border-violet-200"
                      >
                        {/* Header: Avatar, Name, Grade, Edit */}
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${
                                kid.avatarColor || 'from-violet-500 to-indigo-600'
                              } flex items-center justify-center text-white font-bold text-base shadow-sm group-hover:scale-105 transition-transform`}
                            >
                              {kid.avatarInitials}
                            </div>
                            <div>
                              <h4 className="font-bold text-ink text-base group-hover:text-violet-700 transition-colors">
                                {kid.name}
                              </h4>
                              <p className="text-xs text-ink/60 flex items-center gap-2">
                                <span className="font-semibold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md">
                                  {kid.grade || 'Learner'}
                                </span>
                                {kid.age > 0 && <span>Age {kid.age}</span>}
                              </p>
                            </div>
                          </div>

                          <button
                            onClick={() => handleOpenEditChild(kid)}
                            title="Edit Child Profile"
                            className="p-1.5 text-slate-400 hover:text-violet-600 hover:bg-violet-50 rounded-lg transition-colors"
                          >
                            <Edit3 size={15} />
                          </button>
                        </div>

                        {/* Progress Bar & Summary */}
                        <div className="space-y-1.5 bg-slate-50/80 p-3 rounded-2xl border border-black/5">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-ink/65 font-medium flex items-center gap-1">
                              <TrendingUp size={12} className="text-emerald-600" />
                              Overall Progress
                            </span>
                            <span className="font-bold text-violet-700">{kid.progress?.overall || 0}%</span>
                          </div>
                          <ProgressBar value={kid.progress?.overall || 0} size="sm" />
                          <div className="flex justify-between text-[11px] text-ink/50 pt-1">
                            <span>{kid.progress?.activitiesCompleted || 0} Activities Done</span>
                            <span>{kid.progress?.subjectsEnrolled || enrolledSubjects.length} Subjects</span>
                          </div>
                        </div>

                        {/* Subject Chips */}
                        <div className="space-y-1.5">
                          <p className="text-[11px] font-semibold text-ink/60 uppercase tracking-wider">
                            Active Subjects
                          </p>
                          <div className="flex flex-wrap gap-1.5 max-h-16 overflow-hidden">
                            {enrolledSubjects.slice(0, 4).map((sub) => (
                              <span
                                key={sub.id}
                                className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-black/5"
                              >
                                <span>{sub.emoji || '📚'}</span>
                                <span className="truncate max-w-[90px]">{sub.name}</span>
                              </span>
                            ))}
                            {enrolledSubjects.length > 4 && (
                              <span className="text-[10px] font-bold text-violet-600 bg-violet-50 px-2 py-1 rounded-lg">
                                +{enrolledSubjects.length - 4} more
                              </span>
                            )}
                            {enrolledSubjects.length === 0 && (
                              <span className="text-xs text-ink/40 italic">No subjects enrolled yet</span>
                            )}
                          </div>
                        </div>

                        {/* Direct Action Links */}
                        <div className="pt-2 border-t border-black/5 grid grid-cols-3 gap-2">
                          <button
                            onClick={() => router.push(`/planner?child=${kid.id}`)}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 transition-colors text-[11px] font-bold"
                          >
                            <Calendar size={14} className="text-violet-600" />
                            <span>Week Plan</span>
                          </button>
                          <button
                            onClick={() => router.push(`/roadmap?child=${kid.id}`)}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 transition-colors text-[11px] font-bold"
                          >
                            <Route size={14} className="text-emerald-600" />
                            <span>Roadmap</span>
                          </button>
                          <button
                            onClick={() => router.push(`/syllabus-generator`)}
                            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 transition-colors text-[11px] font-bold"
                          >
                            <Sparkles size={14} className="text-purple-600" />
                            <span>AI Syllabus</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* ── Family Email Digest & Automation Card ───────────── */}
              <section className="bg-white p-6 rounded-3xl shadow-sm border border-black/5 space-y-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-ink flex items-center gap-2">
                      <Bell size={18} className="text-violet-600" />
                      Family Email Digests & Schedules
                    </h3>
                    <p className="text-xs text-ink/60 mt-0.5">
                      Keep parents and tutors updated with automated lesson schedules and accomplishment reports.
                    </p>
                  </div>
                  <button
                    onClick={handleSaveDigestPreferences}
                    disabled={savingPrefs}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold shadow-sm transition-all active:scale-95 disabled:opacity-50"
                  >
                    {savingPrefs ? <Clock size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                    Save Preferences
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
                  {/* Option 1: Daily Agenda */}
                  <div
                    onClick={() => setDailyAgenda(!dailyAgenda)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                      dailyAgenda
                        ? 'bg-violet-50/60 border-violet-200 text-ink'
                        : 'bg-slate-50 border-slate-200/80 text-ink/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-violet-800">Daily Agenda</span>
                      <input
                        type="checkbox"
                        checked={dailyAgenda}
                        onChange={() => setDailyAgenda(!dailyAgenda)}
                        className="rounded text-violet-600 focus:ring-violet-500 h-4 w-4"
                      />
                    </div>
                    <p className="text-xs text-ink/70">
                      Delivered at <strong>7:00 AM</strong> with today&apos;s planned activities and lessons for all kids.
                    </p>
                  </div>

                  {/* Option 2: Evening Progress */}
                  <div
                    onClick={() => setEveningProgress(!eveningProgress)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                      eveningProgress
                        ? 'bg-emerald-50/60 border-emerald-200 text-ink'
                        : 'bg-slate-50 border-slate-200/80 text-ink/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-emerald-800">Evening Progress</span>
                      <input
                        type="checkbox"
                        checked={eveningProgress}
                        onChange={() => setEveningProgress(!eveningProgress)}
                        className="rounded text-emerald-600 focus:ring-emerald-500 h-4 w-4"
                      />
                    </div>
                    <p className="text-xs text-ink/70">
                      Delivered at <strong>6:00 PM</strong> highlighting completed tasks, quiz scores, and milestones.
                    </p>
                  </div>

                  {/* Option 3: Weekly Report */}
                  <div
                    onClick={() => setWeeklyReport(!weeklyReport)}
                    className={`cursor-pointer rounded-2xl p-4 border transition-all ${
                      weeklyReport
                        ? 'bg-amber-50/60 border-amber-200 text-ink'
                        : 'bg-slate-50 border-slate-200/80 text-ink/60'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-bold text-amber-800">Sunday Weekly Planner</span>
                      <input
                        type="checkbox"
                        checked={weeklyReport}
                        onChange={() => setWeeklyReport(!weeklyReport)}
                        className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4"
                      />
                    </div>
                    <p className="text-xs text-ink/70">
                      Delivered on <strong>Sunday evening</strong> with the upcoming week&apos;s complete roadmap and syllabus.
                    </p>
                  </div>
                </div>
              </section>
            </div>

            {/* ── RIGHT COLUMN: Parents, Invitations & Team (1 col) ─── */}
            <div className="space-y-6">
              {/* 1. Parents & Educators Card */}
              <section className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-ink flex items-center gap-2">
                      <User size={18} className="text-violet-600" />
                      Parents & Educators
                    </h3>
                    <p className="text-xs text-ink/60 mt-0.5">
                      Co-parents collaborating in this workspace.
                    </p>
                  </div>
                  {isOwner && (
                    <button
                      onClick={() => {
                        setDevModeCode(null);
                        setIsInviteModalOpen(true);
                      }}
                      className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-xl transition-colors"
                      title="Invite Member"
                    >
                      <UserPlus size={16} />
                    </button>
                  )}
                </div>

                <div className="space-y-2.5">
                  {members.map((member, index) => {
                    const name = member.display_name || member.member_email.split('@')[0];
                    const initials = name.slice(0, 2).toUpperCase();
                    const isSelf = profile?.id === member.member_user_id;

                    return (
                      <article
                        key={member.member_id}
                        className="flex items-center gap-3 rounded-2xl border border-black/5 p-3 hover:bg-slate-50 transition-colors"
                      >
                        {/* Colored Initials Avatar */}
                        <div
                          className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getAvatarColor(
                            member.member_role,
                            index
                          )} flex items-center justify-center text-white text-xs font-bold shadow-sm shrink-0`}
                        >
                          {initials}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <p className="font-semibold text-xs text-ink truncate">
                              {member.display_name || 'Homeschool Parent'}
                            </p>
                            {isSelf && (
                              <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.2 rounded font-medium">
                                You
                              </span>
                            )}
                            {member.member_role === 'owner' && (
                              <span title="Workspace Creator" className="rounded-full bg-violet-100 p-0.5 text-violet-600">
                                <Shield size={10} />
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-ink/65 truncate flex items-center gap-1 mt-0.5">
                            <Mail size={11} className="opacity-50 shrink-0" />
                            {member.member_email}
                          </p>

                          <span
                            className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider mt-1.5 border ${
                              member.member_role === 'owner'
                                ? 'bg-violet-50 border-violet-100 text-violet-700'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            {member.member_role === 'owner' ? 'Owner' : 'Parent / Educator'}
                          </span>
                        </div>

                        {isOwner && !isSelf && (
                          <button
                            onClick={() => handleRemoveMember(member.member_user_id)}
                            title="Remove member"
                            className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-auto"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </article>
                    );
                  })}
                </div>
              </section>

              {/* 2. Pending Invitations Card */}
              <section className="bg-white p-5 rounded-3xl shadow-sm border border-black/5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-base font-bold text-ink flex items-center gap-2">
                      <Clock size={18} className="text-pink-500" />
                      Pending Invites
                    </h3>
                    <p className="text-xs text-ink/60 mt-0.5">
                      Joining codes waiting to be claimed.
                    </p>
                  </div>
                </div>

                {invitations.filter((inv) => !inv.is_used).length === 0 ? (
                  <div className="py-6 flex flex-col items-center justify-center text-center p-3 border border-dashed border-black/10 rounded-2xl">
                    <p className="text-xs text-ink/50 font-medium">No pending invitations</p>
                    <p className="text-[11px] text-ink/40 mt-1 max-w-[200px]">
                      Share your workspace code with co-parents to coordinate together.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[320px] overflow-y-auto pr-1">
                    {invitations
                      .filter((inv) => !inv.is_used)
                      .map((invite) => (
                        <article
                          key={invite.id}
                          className="rounded-2xl border border-black/5 p-3 space-y-2 bg-pink-50/10 hover:bg-pink-50/20 transition-all"
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
                              className="flex items-center gap-1.5 rounded-lg bg-violet-50 hover:bg-violet-100 border border-violet-200/80 px-2.5 py-1 text-xs font-bold text-violet-800 font-mono cursor-pointer transition-colors"
                              title="Click to copy join code"
                            >
                              {copiedCode === invite.code ? (
                                <Check size={12} className="text-emerald-600" />
                              ) : (
                                <Copy size={11} />
                              )}
                              <span>{invite.code}</span>
                            </div>

                            <span className="inline-flex items-center gap-1 rounded-full bg-pink-50 border border-pink-100 px-2 py-0.5 text-[10px] font-semibold text-pink-600">
                              <span className="h-1.5 w-1.5 rounded-full bg-pink-500 animate-pulse" />
                              Pending
                            </span>

                            {isOwner && (
                              <button
                                onClick={() => handleCancelInvite(invite.id)}
                                title="Cancel invitation"
                                className="p-1 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors ml-1"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        </article>
                      ))}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      ) : (
        /* ==================== NON-FAMILY SPLIT SCREEN (CREATE OR JOIN) ==================== */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch mt-4">
          {/* Card A: Create a Family Workspace */}
          <section className="bg-white rounded-3xl shadow-md border border-black/5 overflow-hidden flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
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
                <Button
                  className="w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold py-2.5 rounded-xl hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all duration-200 active:scale-[0.98]"
                  type="submit"
                >
                  Create Workspace
                </Button>
              </form>
            </div>
          </section>

          {/* Card B: Join an Existing Workspace */}
          <section className="bg-white rounded-3xl shadow-md border border-black/5 overflow-hidden flex flex-col justify-between group hover:shadow-lg transition-all duration-300">
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
                If your partner has already created a family workspace, enter the 6-character secure joining code sent to your email address (or shared by your partner) to immediately link your account.
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
                <Button
                  className="w-full bg-gradient-to-r from-pink-600 to-rose-600 text-white font-bold py-2.5 rounded-xl hover:from-pink-700 hover:to-rose-700 shadow-md transition-all duration-200 active:scale-[0.98]"
                  type="submit"
                >
                  Join Workspace
                </Button>
              </form>
            </div>
          </section>
        </div>
      )}

      {/* ==================== DIALOG MODAL: ADD CHILD ==================== */}
      {isAddChildModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full border border-black/5 relative animate-scale-up space-y-4">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Baby className="text-violet-600" size={20} />
                Add New Child Learner
              </h3>
              <p className="text-xs text-ink/60 mt-1">
                Adds a new child profile to this family workspace for curriculum tracking.
              </p>
            </div>

            <form onSubmit={handleAddChild} className="space-y-4">
              <InputField
                label="Child's Name"
                onChange={(event) => setChildName(event.target.value)}
                placeholder="e.g. Emma"
                required
                value={childName}
                className="bg-slate-50 focus:bg-white"
              />
              <InputField
                label="Grade Level"
                onChange={(event) => setChildGrade(event.target.value)}
                placeholder="e.g. Grade 3 / 4th Grade"
                required
                value={childGrade}
                className="bg-slate-50 focus:bg-white"
              />
              <InputField
                label="Date of Birth"
                type="date"
                onChange={(event) => setChildDob(event.target.value)}
                value={childDob}
                className="bg-slate-50 focus:bg-white"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddChildModalOpen(false)}
                  className="px-4 py-2 border border-black/10 hover:bg-slate-50 text-ink/70 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all duration-200 active:scale-95"
                >
                  Add Child
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DIALOG MODAL: EDIT CHILD ==================== */}
      {isEditChildModalOpen && editingKid && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full border border-black/5 relative animate-scale-up space-y-4">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Edit3 className="text-violet-600" size={20} />
                Edit Learner Profile
              </h3>
              <p className="text-xs text-ink/60 mt-1">
                Update name, grade level, and birth date for {editingKid.name}.
              </p>
            </div>

            <form onSubmit={handleSaveEditChild} className="space-y-4">
              <InputField
                label="Child's Name"
                onChange={(event) => setEditChildName(event.target.value)}
                required
                value={editChildName}
                className="bg-slate-50 focus:bg-white"
              />
              <InputField
                label="Grade Level"
                onChange={(event) => setEditChildGrade(event.target.value)}
                required
                value={editChildGrade}
                className="bg-slate-50 focus:bg-white"
              />
              <InputField
                label="Date of Birth"
                type="date"
                onChange={(event) => setEditChildDob(event.target.value)}
                value={editChildDob}
                className="bg-slate-50 focus:bg-white"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditChildModalOpen(false);
                    setEditingKid(null);
                  }}
                  className="px-4 py-2 border border-black/10 hover:bg-slate-50 text-ink/70 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all duration-200 active:scale-95"
                >
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DIALOG MODAL: EDIT WORKSPACE NAME ==================== */}
      {isEditFamilyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full border border-black/5 relative animate-scale-up space-y-4">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Edit3 className="text-violet-600" size={20} />
                Rename Family Workspace
              </h3>
              <p className="text-xs text-ink/60 mt-1">
                Updates the shared family display name visible to all members.
              </p>
            </div>

            <form onSubmit={handleUpdateFamilyName} className="space-y-4">
              <InputField
                label="Workspace Name"
                onChange={(event) => setEditFamilyNameInput(event.target.value)}
                placeholder="e.g. The Sharma Family"
                required
                value={editFamilyNameInput}
                className="bg-slate-50 focus:bg-white"
              />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditFamilyModalOpen(false)}
                  className="px-4 py-2 border border-black/10 hover:bg-slate-50 text-ink/70 font-semibold rounded-xl text-xs transition-colors"
                >
                  Cancel
                </button>
                <Button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl text-xs hover:from-violet-700 hover:to-indigo-700 shadow-md transition-all duration-200 active:scale-95"
                >
                  Update Name
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== DIALOG MODAL: INVITE MEMBER ==================== */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl shadow-2xl p-6 max-w-md w-full border border-black/5 relative animate-scale-up space-y-4">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <UserPlus className="text-violet-600" size={20} />
                Invite Family Member / Educator
              </h3>
              <p className="text-xs text-ink/60 mt-1">
                Generates a secure, 7-day joining code to add another parent to your workspace.
              </p>
            </div>

            {devModeCode ? (
              <div className="space-y-4 animate-fade-in">
                <div className="rounded-2xl bg-violet-50 border border-violet-100 p-4 space-y-2">
                  <p className="text-xs font-semibold text-violet-800 flex items-center gap-1.5">
                    <Sparkles size={14} />
                    Joining Code Ready
                  </p>
                  <p className="text-xs text-violet-700/80 leading-relaxed">
                    Share this code with your partner. They can enter it on the Family page or during signup to link immediately:
                  </p>

                  <div className="flex items-center justify-between gap-3 bg-white p-3 rounded-xl border border-violet-200/60 shadow-sm mt-3">
                    <span className="font-mono text-xl font-extrabold tracking-wider text-violet-900">
                      {devModeCode}
                    </span>
                    <button
                      onClick={() => handleCopyCode(devModeCode)}
                      className="flex items-center gap-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white px-3 py-1.5 text-xs font-bold transition-all shadow-sm active:scale-95"
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
                    Done
                  </Button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSendInvite} className="space-y-4">
                <InputField
                  label="Partner's Email Address"
                  onChange={(event) => setInviteEmail(event.target.value)}
                  placeholder="partner@example.com"
                  required
                  type="email"
                  value={inviteEmail}
                  className="bg-slate-50 focus:bg-white"
                />

                <p className="text-[11px] text-ink/55 leading-relaxed">
                  <strong>Important:</strong> The invited partner will receive the joining code to access all shared kids and curriculums.
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
