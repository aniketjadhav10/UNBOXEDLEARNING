// Topics Page — real data, dynamic /subjects/:subjectId/topics
import { ArrowLeft, CheckCircle2, Circle, ListChecks } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import { TopicCard } from '../../components/TopicCard';
import { EmptyState } from '../../components/ui/EmptyState';
import { ProgressBar } from '../../components/ui/ProgressBar';
import { SkeletonGrid } from '../../components/ui/SkeletonCard';
import { useData } from '../../context/DataContext';

export function TopicsPage() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const { subjects, topics, loading, error, refresh } = useData();

  const subject = subjectId ? subjects.find((s) => s.id === subjectId) : null;
  const filteredTopics = subjectId
    ? topics.filter((t) => t.subjectId === subjectId)
    : topics;

  const completedCount = filteredTopics.filter((t) => t.completed).length;

  if (loading) return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-24 bg-gray-200 rounded-2xl animate-pulse" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonGrid count={6} variant="row" />
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
      {/* Back */}
      {subject && (
        <button
          onClick={() => navigate('/subjects')}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-violet-600 transition-colors font-medium"
        >
          <ArrowLeft size={16} /> Back to Subjects
        </button>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 overflow-hidden">
        {subject ? (
          <div>
            <div className={`h-20 bg-gradient-to-br ${subject.gradient} relative px-6 flex items-end pb-4`}>
              <span className="text-3xl mr-3">{subject.emoji}</span>
              <div>
                <h2 className="text-white font-bold text-lg leading-tight">{subject.name}</h2>
                <p className="text-white/70 text-xs">{filteredTopics.length} Topics</p>
              </div>
            </div>
            <div className="px-6 py-4">
              <div className="flex justify-between text-xs mb-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle2 size={13} /> {completedCount} done</span>
                  <span className="flex items-center gap-1 text-gray-400"><Circle size={13} /> {filteredTopics.length - completedCount} remaining</span>
                </div>
                <span className="font-bold text-violet-600">{subject.progress}%</span>
              </div>
              <ProgressBar value={subject.progress} color={subject.gradient} />
            </div>
          </div>
        ) : (
          <div className="p-5">
            <h2 className="text-xl font-bold text-gray-900">All Topics</h2>
            <p className="text-sm text-gray-400 mt-0.5">{completedCount} of {filteredTopics.length} completed</p>
          </div>
        )}
      </div>

      {/* Topics grid */}
      {filteredTopics.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title="No topics yet"
          description={subjectId ? 'No topics have been added for this subject yet.' : 'No topics found in the database.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTopics.map((topic, i) => (
            <TopicCard key={topic.id} topic={topic} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
