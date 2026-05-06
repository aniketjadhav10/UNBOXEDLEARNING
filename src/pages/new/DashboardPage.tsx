// Dashboard Page — uses real Supabase data via DataContext
import {
  Activity,
  BookOpen,
  CheckCircle2,
  Clock,
  GraduationCap,
  ListChecks,
  RefreshCw,
  TrendingUp,
  Users,
  Zap,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SkeletonCard } from '../../components/ui/SkeletonCard';

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({
  label, value, icon: Icon, iconBg, iconColor, sub,
}: {
  label: string; value: string | number;
  icon: React.ElementType; iconBg: string; iconColor: string; sub?: string;
}) {
  return (
    <div className="bg-white rounded-2xl shadow-card p-5 flex items-center gap-4 border border-gray-100/80">
      <div className={`w-12 h-12 ${iconBg} rounded-xl flex items-center justify-center flex-shrink-0`}>
        <Icon size={22} className={iconColor} />
      </div>
      <div>
        <p className="text-xs text-gray-400 font-medium mb-0.5">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

/* ─── Section Header ─────────────────────────────────────────── */
function SectionHeader({ title, actionLabel, onAction }: {
  title: string; actionLabel?: string; onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-4">
      <h2 className="text-base font-bold text-gray-900">{title}</h2>
      {actionLabel && (
        <button onClick={onAction} className="text-xs text-violet-600 font-semibold hover:text-violet-800 transition-colors">
          {actionLabel} →
        </button>
      )}
    </div>
  );
}

/* ─── Dashboard Page ─────────────────────────────────────────── */
export function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const { kids, subjects, topics, tasks, loading, error, isEmpty, refresh } = useData();

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const completedTopics = topics.filter((t) => t.completed).length;
  const avgProgress = subjects.length > 0
    ? Math.round(subjects.reduce((a, s) => a + s.progress, 0) / subjects.length)
    : 0;
  const scheduledTasks = tasks.filter((t) => t.isScheduled).length;

  /* ── Loading skeleton ─────────────────────────────────────── */
  if (loading) {
    return (
      <div className="space-y-8 animate-fade-in">
        <div className="h-48 bg-gradient-to-br from-[#1e1b4b] to-[#4c1d95] rounded-3xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
      </div>
    );
  }

  /* ── Error state ──────────────────────────────────────────── */
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
          <RefreshCw size={24} className="text-red-400" />
        </div>
        <h3 className="text-base font-bold text-gray-800 mb-2">Failed to Load Data</h3>
        <p className="text-sm text-gray-400 max-w-sm mb-4">{error}</p>
        <button
          onClick={refresh}
          className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">

      {/* ── Hero Banner ─────────────────────────────────────── */}
      <div className="relative bg-gradient-to-br from-[#1e1b4b] via-[#312e81] to-[#4c1d95] rounded-3xl p-6 lg:p-8 overflow-hidden">
        <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/5 rounded-full" />
        <div className="absolute -bottom-10 -left-6 w-32 h-32 bg-white/5 rounded-full" />
        <div className="absolute top-4 right-20 w-16 h-16 bg-violet-400/20 rounded-full" />
        <div className="relative z-10">
          <p className="text-violet-300 text-sm font-medium mb-1">
            {greeting()}, {user?.name?.split(' ')[0] ?? 'there'} 👋
          </p>
          <h2 className="text-white text-2xl lg:text-3xl font-bold mb-2">
            {isAdmin ? 'Welcome back to your\nhomeschool hub!' : 'Ready to learn something\namazing today?'}
          </h2>
          <p className="text-violet-200 text-sm max-w-md leading-relaxed">
            {isEmpty
              ? 'No data yet — add your first child and subject to get started!'
              : isAdmin
                ? `Managing ${kids.length} kid${kids.length !== 1 ? 's' : ''} · ${subjects.length} subjects · ${scheduledTasks} scheduled tasks.`
                : 'Your learning journey continues. Keep up the great work!'}
          </p>
          <div className="flex flex-wrap gap-3 mt-5">
            <button
              onClick={() => navigate('/subjects')}
              className="flex items-center gap-2 px-4 py-2 bg-white text-violet-700 rounded-xl text-sm font-semibold hover:bg-violet-50 transition-colors shadow-sm"
            >
              <BookOpen size={15} /> Browse Subjects
            </button>
            {isAdmin && (
              <button
                onClick={() => navigate('/kids')}
                className="flex items-center gap-2 px-4 py-2 bg-white/10 text-white border border-white/20 rounded-xl text-sm font-semibold hover:bg-white/20 transition-colors"
              >
                <Users size={15} /> View Kids
              </button>
            )}
            <button
              onClick={refresh}
              title="Refresh data"
              className="flex items-center gap-2 px-3 py-2 bg-white/10 text-white/70 border border-white/10 rounded-xl text-sm hover:bg-white/20 transition-colors"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Grid ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Kids"   value={kids.length}       icon={Users}        iconBg="bg-violet-50" iconColor="text-violet-600" sub="Enrolled learners" />
        <StatCard label="Subjects"     value={subjects.length}   icon={BookOpen}     iconBg="bg-blue-50"   iconColor="text-blue-600"   sub="Active curriculum" />
        <StatCard label="Topics Done"  value={`${completedTopics}/${topics.length}`} icon={CheckCircle2} iconBg="bg-emerald-50" iconColor="text-emerald-600" sub="Topics completed" />
        <StatCard label="Avg Progress" value={`${avgProgress}%`} icon={TrendingUp}   iconBg="bg-amber-50"  iconColor="text-amber-600"  sub="Across subjects" />
      </div>

      {/* ── Content grid ─────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Subject Progress */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
          <SectionHeader title="Subject Progress" actionLabel="All Subjects" onAction={() => navigate('/subjects')} />
          {subjects.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">No subjects yet. Add a child first.</p>
          ) : (
            <div className="space-y-4">
              {subjects.slice(0, 5).map((s) => (
                <div
                  key={s.id}
                  className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors"
                  onClick={() => navigate(`/subjects/${s.id}/topics`)}
                >
                  <span className="text-xl w-8 text-center">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-semibold text-gray-700 truncate">{s.name}</span>
                      <span className="text-xs font-bold text-violet-600 ml-2">{s.progress}%</span>
                    </div>
                    <ProgressBar value={s.progress} size="sm" color={s.gradient} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Kids Overview / Student Stats */}
        {isAdmin ? (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
            <SectionHeader title="Kids Overview" actionLabel="All Kids" onAction={() => navigate('/kids')} />
            {kids.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">No kids added yet.</p>
            ) : (
              <div className="space-y-3">
                {kids.map((kid) => (
                  <div
                    key={kid.id}
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 rounded-xl p-2 -mx-2 transition-colors"
                    onClick={() => navigate(`/kids/${kid.id}`)}
                  >
                    <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${kid.avatarColor} flex items-center justify-center text-white text-xs font-bold flex-shrink-0`}>
                      {kid.avatarInitials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs font-semibold text-gray-800">{kid.name}</span>
                        <span className="text-xs font-bold text-violet-600">{kid.progress.overall}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ProgressBar value={kid.progress.overall} size="sm" className="flex-1" />
                        <span className="text-xs text-gray-400 flex-shrink-0">{kid.grade}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
            <SectionHeader title="My Stats" />
            <div className="grid grid-cols-2 gap-3">
              {[
                { icon: GraduationCap, label: 'Subjects',   value: subjects.length,                         color: 'text-violet-600', bg: 'bg-violet-50' },
                { icon: CheckCircle2,  label: 'Completed',  value: completedTopics,                         color: 'text-emerald-600', bg: 'bg-emerald-50' },
                { icon: ListChecks,    label: 'Topics',     value: topics.length,                           color: 'text-blue-600',   bg: 'bg-blue-50' },
                { icon: Zap,           label: 'Scheduled',  value: scheduledTasks,                         color: 'text-amber-600',  bg: 'bg-amber-50' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className={`${bg} rounded-xl p-4 text-center`}>
                  <Icon size={20} className={`${color} mx-auto mb-2`} />
                  <p className={`text-xl font-bold ${color}`}>{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Recent Tasks ─────────────────────────────────────── */}
      {tasks.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
          <SectionHeader title="Recent Tasks" actionLabel="All Activities" onAction={() => navigate('/activities')} />
          <div className="space-y-3">
            {tasks.slice(0, 5).map((task) => {
              const topic = topics.find((t) => t.id === task.topicId);
              const subject = subjects.find((s) => topic && s.id === topic.subjectId);
              return (
                <div key={task.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${subject?.gradient ?? 'from-gray-400 to-gray-500'} flex items-center justify-center flex-shrink-0`}>
                    <Activity size={16} className="text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-800 truncate">{task.name}</p>
                    <p className="text-xs text-gray-400">
                      {subject?.emoji} {subject?.name ?? 'Unknown'} · {topic?.title ?? ''}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    <span className={[
                      'text-xs font-semibold px-2.5 py-1 rounded-full',
                      task.stage === 'Confident' || task.stage === 'Comfortable'
                        ? 'bg-emerald-100 text-emerald-700'
                        : task.stage === 'Not_Started'
                          ? 'bg-gray-100 text-gray-500'
                          : 'bg-violet-100 text-violet-700',
                    ].join(' ')}>
                      {task.stage.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                    <Clock size={10} />
                    <span>{task.isScheduled ? 'Scheduled' : 'Unscheduled'}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Empty state when DB has no records ─────────────── */}
      {isEmpty && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-8 text-center">
          <div className="text-4xl mb-4">🏫</div>
          <h3 className="text-base font-bold text-gray-800 mb-2">Your homeschool is empty!</h3>
          <p className="text-sm text-gray-400 mb-4 max-w-sm mx-auto">
            Add your first child, then create subjects and topics to get started.
          </p>
          <button
            onClick={() => navigate('/kids')}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-semibold rounded-xl hover:bg-violet-700 transition-colors"
          >
            Add First Child
          </button>
        </div>
      )}
    </div>
  );
}
