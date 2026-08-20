// ============================================================
// LearningPathPage — Child's custom enrolled topic timeline
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import {
  Route, CheckCircle2, Clock, BookOpen, ChevronRight, Loader2, Search, ArrowUpDown, Filter, LayoutGrid
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDebounce } from '../../hooks/useDebounce';
import { fetchTopicsWithBreadcrumb } from '../../services/curriculumService';
import { isTopicCompleted } from '../../services/dataService';
import { BackButton } from '../../components/ui/BackButton';
import type { DbTopicWithBreadcrumb } from '../../types/database';

type GroupedTopics = Record<string, { subject: { id: string; name: string; color: string }; topics: DbTopicWithBreadcrumb[] }>;

export function LearningPathPage() {
  useDocumentTitle('Learning Path');
  const router = useRouter();
  const { kids, rawTasks, taskProgress } = useData();
  const { selectedChildId } = useSettingsStore();

  const childId = selectedChildId || kids[0]?.id || '';
  const child = kids.find(k => k.id === childId);

  const [topics, setTopics] = useState<DbTopicWithBreadcrumb[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'in_progress' | 'completed'>('all');
  const [sortBy, setSortBy] = useState<'default' | 'title' | 'duration'>('default');
  const [groupBy, setGroupBy] = useState<'subject' | 'none'>('subject');

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    if (!childId) return;
    loadPath();
  }, [childId]);

  async function loadPath() {
    try {
      setLoading(true);
      const data = await fetchTopicsWithBreadcrumb(childId);
      setTopics(data);
    } catch (err) {
      console.error('Failed to load learning path', err);
    } finally {
      setLoading(false);
    }
  }

  // Annotate each topic with its completion status
  const annotated = useMemo(() => {
    return topics.map(t => ({
      ...t,
      completed: isTopicCompleted(t.id, rawTasks, taskProgress.filter(p => p.child_id === childId)),
    }));
  }, [topics, rawTasks, taskProgress, childId]);

  const filtered = useMemo(() => {
    let result = annotated.filter(t => {
      const matchSearch = !debouncedSearch ||
        t.title.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (t.subject?.name ?? '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchFilter =
        filter === 'all' ||
        (filter === 'completed' && t.completed) ||
        (filter === 'in_progress' && !t.completed);
      return matchSearch && matchFilter;
    });

    if (sortBy === 'title') {
      result.sort((a, b) => a.title.localeCompare(b.title));
    } else if (sortBy === 'duration') {
      result.sort((a, b) => (b.estimated_hours ?? 0) - (a.estimated_hours ?? 0));
    } else {
      // default: by subject name then by custom_order
      result.sort((a, b) => {
        if (a.subject?.name !== b.subject?.name) {
          return (a.subject?.name ?? '').localeCompare(b.subject?.name ?? '');
        }
        return (a.custom_order ?? 0) - (b.custom_order ?? 0);
      });
    }
    return result;
  }, [annotated, debouncedSearch, filter, sortBy]);

  // Group by subject
  const grouped: GroupedTopics = useMemo(() => {
    return filtered.reduce((acc, t) => {
      const subjectId = t.subject?.id ?? 'unknown';
      if (!acc[subjectId]) {
        acc[subjectId] = { subject: t.subject ?? { id: subjectId, name: 'Unknown', color: '#8b5cf6' }, topics: [] };
      }
      acc[subjectId].topics.push(t);
      return acc;
    }, {} as GroupedTopics);
  }, [filtered]);

  const totalTopics = annotated.length;
  const completedTopics = annotated.filter(t => t.completed).length;
  const progressPct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div>
        <BackButton />
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Route className="w-6 h-6 text-violet-600" />
              Learning Path
            </h1>
            {child && (
              <p className="text-sm text-gray-400 mt-0.5">{child.name}'s custom curriculum</p>
            )}
          </div>
          <button
            onClick={() => router.push('/library')}
            className="text-xs font-semibold text-violet-600 hover:text-violet-800 transition-colors"
          >
            + Add Topics
          </button>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <p className="text-violet-200 text-xs font-semibold uppercase tracking-wider">Overall Progress</p>
            <p className="text-3xl font-black mt-1">{progressPct}%</p>
          </div>
          <div className="text-right">
            <p className="text-violet-200 text-xs">{completedTopics} of {totalTopics} topics done</p>
          </div>
        </div>
        <div className="h-2 bg-white/20 rounded-full overflow-hidden">
          <div
            className="h-full bg-white rounded-full transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Filters and Sorts */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search topics..."
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all bg-gray-50/50"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-gray-100 rounded-xl w-full sm:w-auto">
            {(['all', 'in_progress', 'completed'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex-1 sm:flex-none px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-all ${
                  filter === f ? 'bg-white text-violet-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-3 ml-auto">
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <LayoutGrid size={14} /> Group:
              <select 
                value={groupBy} 
                onChange={(e) => setGroupBy(e.target.value as 'subject' | 'none')}
                className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
              >
                <option value="subject">Subject</option>
                <option value="none">None</option>
              </select>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-gray-600">
              <ArrowUpDown size={14} /> Sort:
              <select 
                value={sortBy} 
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent font-bold text-gray-900 outline-none cursor-pointer"
              >
                <option value="default">Default Route</option>
                <option value="title">Alphabetical</option>
                <option value="duration">Longest First</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="animate-spin text-violet-500" size={32} />
        </div>
      ) : Object.keys(grouped).length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-bold text-lg">No topics enrolled yet</p>
          <p className="text-sm mb-4">Browse the library to build your child's learning path</p>
          <button
            onClick={() => router.push('/library')}
            className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors"
          >
            Browse Library
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {groupBy === 'subject' ? (
            Object.values(grouped).map(({ subject, topics: subTopics }) => (
              <div key={subject.id}>
                {/* Subject header */}
                <div className="flex items-center gap-2 mb-3">
                  <div
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject.color }}
                  />
                  <h2 className="text-sm font-bold text-gray-700">{subject.name}</h2>
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                    {subTopics.filter((t: any) => t.completed).length}/{subTopics.length} done
                  </span>
                </div>

                {/* Topics */}
                <div className="grid grid-cols-1 gap-2">
                  {subTopics.map((topic: any, idx: number) => (
                    <TopicButton key={topic.id} topic={topic} idx={idx} router={router} showSubject={false} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {filtered.map((topic: any, idx: number) => (
                <TopicButton key={topic.id} topic={topic} idx={idx} router={router} showSubject={true} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Helper component to render a single topic button in the list
function TopicButton({ topic, idx, router, showSubject }: { topic: any, idx: number, router: any, showSubject: boolean }) {
  return (
    <button
      onClick={() => router.push(`/topics/${topic.id}/tasks`)}
      className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 group ${
        topic.completed
          ? 'bg-emerald-50 border-emerald-200 shadow-sm'
          : 'bg-white border-gray-100 shadow-sm hover:border-violet-300 hover:shadow-md'
      }`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${
        topic.completed
          ? 'bg-emerald-500 text-white'
          : 'bg-violet-100 text-violet-600'
      }`}>
        {topic.completed ? <CheckCircle2 size={16} /> : idx + 1}
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{topic.title}</p>
        <div className="flex items-center gap-3 mt-1">
          {showSubject && topic.subject && (
            <span className="text-xs font-semibold text-gray-500 flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded border border-gray-200">
              <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: topic.subject.color }} />
              {topic.subject.name}
            </span>
          )}
          {topic.difficulty_level && (
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
              topic.difficulty_level === 'Beginner' ? 'bg-blue-50 text-blue-600' :
              topic.difficulty_level === 'Intermediate' ? 'bg-amber-50 text-amber-600' :
              'bg-rose-50 text-rose-600'
            }`}>
              {topic.difficulty_level}
            </span>
          )}
          {(topic.estimated_hours ?? 0) > 0 && (
            <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
              <Clock size={12} />
              {topic.estimated_hours}h
            </span>
          )}
        </div>
      </div>

      <ChevronRight
        size={18}
        className="text-gray-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all flex-shrink-0"
      />
    </button>
  );
}
