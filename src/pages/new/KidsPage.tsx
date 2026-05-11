// Kids Page — real data from DataContext
import { Plus, RefreshCw, Users } from 'lucide-react';
import { KidCard } from '../../components/KidCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { CurriculumFormModal, type FormField } from '../../components/curriculum/CurriculumFormModal';
import { createItem } from '../../services/curriculumService';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useState } from 'react';
import { useToast } from '../../store/useToastStore';

const KID_FIELDS: FormField[] = [
  { name: 'name', label: 'Child Name', type: 'text', required: true, placeholder: 'e.g. Leo' },
  { name: 'grade_level', label: 'Grade Level', type: 'text', required: true, placeholder: 'e.g. 4th Grade' },
  { name: 'date_of_birth', label: 'Date of Birth', type: 'text', placeholder: 'YYYY-MM-DD' }
];

export function KidsPage() {
  const { kids, loading, error, isEmpty, refresh } = useData();
  const { user } = useAuth();
  const toast = useToast();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleAddKid(data: any) {
    setSubmitting(true);
    try {
      await createItem('children', {
        ...data,
        user_id: user?.id,
      });
      await refresh();
      toast.success('Kid added successfully!');
      setIsModalOpen(false);
    } catch (err) {
      console.error(err);
      toast.error('Failed to add child');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-10 bg-gray-200 rounded-xl w-1/3 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <SkeletonGrid count={3} variant="card" />
      </div>
    </div>
  );

  if (error) return (
    <div className="text-center py-20">
      <p className="text-sm text-red-400 mb-3">{error}</p>
      <button onClick={refresh} className="px-4 py-2 bg-violet-600 text-white text-sm rounded-xl">Retry</button>
    </div>
  );

  const avgProgress = kids.length > 0
    ? Math.round(kids.reduce((a, k) => a + k.progress.overall, 0) / kids.length)
    : 0;
  const totalActivities = kids.reduce((a, k) => a + k.progress.activitiesCompleted, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Kids</h2>
          <p className="text-sm text-gray-400 mt-0.5">{kids.length} enrolled learner{kids.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 rounded-xl transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <button onClick={() => setIsModalOpen(true)} id="add-kid-btn" className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm">
            <Plus size={16} /> Add Kid
          </button>
        </div>
      </div>

      {/* Summary ribbon */}
      {kids.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Kids',    value: kids.length,     color: 'bg-violet-50 text-violet-700' },
            { label: 'Avg Progress',  value: `${avgProgress}%`, color: 'bg-emerald-50 text-emerald-700' },
            { label: 'Tasks Done',    value: totalActivities, color: 'bg-amber-50 text-amber-700' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${color} rounded-2xl p-4 text-center`}>
              <p className="text-2xl font-bold">{value}</p>
              <p className="text-xs font-medium mt-0.5 opacity-80">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Kids grid */}
      {isEmpty || kids.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No kids added yet"
          description="Add your first child to start managing their homeschool curriculum and tracking progress."
          actionLabel="Add Kid"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {kids.map((kid) => <KidCard key={kid.id} kid={kid} />)}
        </div>
      )}

      <CurriculumFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Kid"
        fields={KID_FIELDS}
        onSubmit={handleAddKid}
        loading={submitting}
      />
    </div>
  );
}
