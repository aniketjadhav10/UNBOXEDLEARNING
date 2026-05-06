// Subjects Page — real data from DataContext with search filter
import { BookOpen, RefreshCw, Search } from 'lucide-react';
import { useState } from 'react';
import { SubjectCard } from '../../components/SubjectCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { useData } from '../../context/DataContext';

export function SubjectsPage() {
  const { subjects, loading, error, isEmpty, refresh } = useData();
  const [search, setSearch] = useState('');

  const filtered = subjects.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.description.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-10 bg-gray-200 rounded-xl w-1/3 animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        <SkeletonGrid count={8} variant="card" />
      </div>
    </div>
  );

  if (error) return (
    <div className="text-center py-20">
      <p className="text-sm text-red-400 mb-3">{error}</p>
      <button onClick={refresh} className="px-4 py-2 bg-violet-600 text-white text-sm rounded-xl">Retry</button>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Subjects</h2>
          <p className="text-sm text-gray-400 mt-0.5">{subjects.length} subjects in curriculum</p>
        </div>
        <div className="flex gap-2">
          <button onClick={refresh} className="p-2.5 bg-white border border-gray-200 text-gray-400 hover:text-violet-600 rounded-xl transition-colors" title="Refresh">
            <RefreshCw size={15} />
          </button>
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              id="subject-search"
              type="text"
              placeholder="Search subjects..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
            />
          </div>
        </div>
      </div>

      {/* Grid */}
      {isEmpty || subjects.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects yet"
          description="Add subjects for each child from the Kids section to get started."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="No subjects found"
          description={`No subjects match "${search}". Try a different keyword.`}
          actionLabel="Clear Search"
          onAction={() => setSearch('')}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filtered.map((subject) => <SubjectCard key={subject.id} subject={subject} />)}
        </div>
      )}
    </div>
  );
}
