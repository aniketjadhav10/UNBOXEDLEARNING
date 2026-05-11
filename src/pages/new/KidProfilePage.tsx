// Kid Profile Page — real data from DataContext
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, BookOpen, Edit3, Star, Trophy, Zap } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { Badge } from '../../components/ui/Badge';
import { TopicCard } from '../../components/TopicCard';
import { SkeletonCard } from '../../components/ui/SkeletonCard';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { updateItem } from '../../services/curriculumService';
import { useToast } from '../../store/useToastStore';

type Tab = 'overview' | 'subjects' | 'topics' | 'achievements';
const TABS: { id: Tab; label: string }[] = [
  { id: 'overview',      label: 'Overview'     },
  { id: 'subjects',      label: 'Subjects'     },
  { id: 'topics',        label: 'Topics'       },
  { id: 'achievements',  label: 'Achievements' },
];

const ACHIEVEMENT_LIST = [
  { emoji: '🌟', title: 'First Subject',  desc: 'Added your first subject.' },
  { emoji: '🏆', title: 'Perfect Week',   desc: 'Completed all tasks in a week.' },
  { emoji: '🔥', title: '7-Day Streak',   desc: 'Learned 7 days in a row.' },
  { emoji: '🎨', title: 'Art Explorer',   desc: 'Completed all Art topics.' },
  { emoji: '📚', title: 'Bookworm',       desc: 'Read 10+ materials.' },
];

const KID_FIELDS: FormField[] = [
  { name: 'name', label: 'Child Name', type: 'text', required: true, placeholder: 'e.g. Leo' },
  { name: 'grade_level', label: 'Grade Level', type: 'text', required: true, placeholder: 'e.g. 4th Grade' },
  { name: 'date_of_birth', label: 'Date of Birth', type: 'text', placeholder: 'YYYY-MM-DD' }
];

export function KidProfilePage() {
  const { kidId } = useParams<{ kidId: string }>();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>('overview');
  const { kids, subjects, topics, loading, refresh } = useData();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const kid = kids.find((k) => k.id === kidId);
  const kidSubjects = subjects.filter((s) => s.childId === kidId);
  const kidTopics   = topics.filter((t) => kidSubjects.some((s) => s.id === t.subjectId));
  const completedTopics = kidTopics.filter((t) => t.completed);

  async function handleUpdateKid(data: any) {
    if (!kid) return;
    setSubmitting(true);
    try {
      await updateItem('children', kid.id, data);
      await refresh();
      toast.success('Child profile updated!');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to update child profile');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="space-y-4 animate-fade-in">
      <SkeletonCard className="h-40" />
      <div className="grid grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <SkeletonCard key={i} className="h-20" />)}
      </div>
    </div>
  );

  if (!kid) return (
    <div className="text-center py-20">
      <p className="text-gray-400 text-sm">Kid not found.</p>
      <button onClick={() => navigate('/kids')} className="mt-3 text-violet-600 text-sm font-semibold">← Back to Kids</button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in max-w-4xl">
      <button onClick={() => navigate('/kids')} className="flex items-center gap-2 text-sm text-gray-400 hover:text-violet-600 transition-colors font-medium">
        <ArrowLeft size={16} /> Back to Kids
      </button>

      {/* Profile hero */}
      <div className="bg-white rounded-3xl shadow-card border border-gray-100/80 overflow-hidden">
        <div className={`h-28 bg-gradient-to-br ${kid.avatarColor} relative`}>
          <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full" />
        </div>
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${kid.avatarColor} flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-white`}>
              {kid.avatarInitials}
            </div>
            <button 
              id="edit-profile-btn" 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-violet-50 hover:bg-violet-100 text-violet-700 text-sm font-semibold rounded-xl transition-colors"
            >
              <Edit3 size={14} /> Edit
            </button>
          </div>
          <h2 className="text-xl font-bold text-gray-900">{kid.name}</h2>
          <p className="text-sm text-gray-400 mb-3">{kid.grade}{kid.age > 0 ? ` · Age ${kid.age}` : ''}</p>
          <p className="text-sm text-gray-600 leading-relaxed mb-4">{kid.bio}</p>
          <div className="flex flex-wrap gap-2">
            <Badge label={`${kidSubjects.length} Subjects`} variant="violet" size="md" />
            <Badge label={`${completedTopics.length} Topics Done`} variant="gray" size="md" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Overall',     value: `${kid.progress.overall}%`,           icon: Star,    bg: 'bg-violet-50', tc: 'text-violet-700' },
          { label: 'Subjects',    value: kid.progress.subjectsEnrolled,         icon: BookOpen, bg: 'bg-blue-50',  tc: 'text-blue-700'   },
          { label: 'Tasks Done',  value: kid.progress.activitiesCompleted,      icon: Zap,     bg: 'bg-amber-50',  tc: 'text-amber-700'  },
          { label: 'Achievements',value: kid.progress.achievements,             icon: Trophy,  bg: 'bg-emerald-50',tc: 'text-emerald-700'},
        ].map(({ label, value, icon: Icon, bg, tc }) => (
          <div key={label} className={`${bg} rounded-2xl p-4 text-center`}>
            <Icon size={18} className={`${tc} mx-auto mb-2`} />
            <p className={`text-xl font-bold ${tc}`}>{value}</p>
            <p className="text-xs text-gray-500 mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 overflow-hidden">
        <div className="flex border-b border-gray-100 px-2 pt-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={['px-4 py-2.5 text-sm font-semibold rounded-t-lg mr-1 transition-colors',
                tab === t.id ? 'bg-violet-600 text-white' : 'text-gray-500 hover:text-violet-600 hover:bg-violet-50'
              ].join(' ')}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="p-5">
          {tab === 'overview' && (
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Enrolled Subjects</p>
                <div className="flex flex-wrap gap-2">
                  {kidSubjects.map((s) => <Badge key={s.id} label={`${s.emoji} ${s.name}`} variant="violet" size="md" />)}
                  {kidSubjects.length === 0 && <p className="text-sm text-gray-400">No subjects yet.</p>}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Overall Progress</p>
                <ProgressBar value={kid.progress.overall} size="lg" showLabel />
              </div>
            </div>
          )}

          {tab === 'subjects' && (
            <div className="space-y-3">
              {kidSubjects.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8">No subjects assigned to this child.</p>
                : kidSubjects.map((s) => (
                  <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/subjects/${s.id}/topics`)}>
                    <span className="text-xl">{s.emoji}</span>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-gray-800">{s.name}</p>
                      <ProgressBar value={s.progress} size="sm" color={s.gradient} className="mt-1.5" />
                    </div>
                    <span className="text-xs font-bold text-violet-600">{s.progress}%</span>
                  </div>
                ))}
            </div>
          )}

          {tab === 'topics' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {kidTopics.length === 0
                ? <p className="text-sm text-gray-400 text-center py-8 col-span-2">No topics yet.</p>
                : kidTopics.slice(0, 6).map((t, i) => <TopicCard key={t.id} topic={t} index={i} />)}
            </div>
          )}

          {tab === 'achievements' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACHIEVEMENT_LIST.slice(0, Math.max(1, kid.progress.achievements)).map((ach) => (
                <div key={ach.title} className="flex items-start gap-3 p-4 bg-gradient-to-br from-violet-50 to-purple-50 rounded-xl border border-violet-100">
                  <span className="text-2xl">{ach.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-violet-900">{ach.title}</p>
                    <p className="text-xs text-violet-500 mt-0.5">{ach.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <CurriculumFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Edit Profile"
        fields={KID_FIELDS}
        initialData={{
          name: kid.name,
          grade_level: kid.grade,
          date_of_birth: kid.date_of_birth // Note: might need to be added to Kid in DataContext
        }}
        onSubmit={handleUpdateKid}
        loading={submitting}
      />
    </div>
  );
}
