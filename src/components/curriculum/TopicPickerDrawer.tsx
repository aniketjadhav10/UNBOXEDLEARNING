// ============================================================
// TopicPickerDrawer — Cherry-pick individual topics from a subject
// ============================================================
import React, { useState, useEffect } from 'react';
import { X, Loader2, CheckCircle2, Circle, BookOpen } from 'lucide-react';
import { useToast } from '../../store/useToastStore';
import {
  fetchTopics,
  enrollInTopic,
  unenrollFromTopic,
  fetchSubjectById,
} from '../../services/curriculumService';
import { supabase } from '../../services/supabase';
import type { DbTopic } from '../../types/database';

interface Props {
  subjectId: string;
  childId: string;
  onClose: () => void;
  onEnrolled: () => void;
}

interface TopicWithState extends DbTopic {
  enrolled: boolean;
  toggling: boolean;
}

export function TopicPickerDrawer({ subjectId, childId, onClose, onEnrolled }: Props) {
  const toast = useToast();
  const [subjectName, setSubjectName] = useState('');
  const [topics, setTopics] = useState<TopicWithState[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    // Prevent body scroll while drawer open
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [subjectId, childId]);

  async function loadData() {
    try {
      setLoading(true);

      // Load subject name and all topics
      const [subject, allTopics] = await Promise.all([
        fetchSubjectById(subjectId),
        fetchTopics(subjectId),
      ]);
      setSubjectName(subject?.name ?? 'Subject');

      // Check which topics the child is already enrolled in
      const { data: enrolled } = await supabase
        .from('child_topics')
        .select('topic_id')
        .eq('child_id', childId)
        .in('topic_id', allTopics.map(t => t.id));

      const enrolledIds = new Set((enrolled ?? []).map((e: any) => e.topic_id));

      // Filter out topics that are already assigned to the child
      const unassignedTopics = allTopics.filter(t => !enrolledIds.has(t.id));

      setTopics(unassignedTopics.map(t => ({
        ...t,
        enrolled: false,
        toggling: false,
      })));
    } catch (err) {
      console.error('Failed to load topics', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleToggle(topic: TopicWithState) {
    setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, toggling: true } : t));
    try {
      if (topic.enrolled) {
        await unenrollFromTopic(childId, topic.id);
        toast.success(`Removed "${topic.title}"`);
      } else {
        await enrollInTopic(childId, topic.id, 'manual');
        toast.success(`Added "${topic.title}"`);
      }
      setTopics(prev =>
        prev.map(t => t.id === topic.id ? { ...t, enrolled: !t.enrolled, toggling: false } : t)
      );
      onEnrolled();
    } catch (err) {
      toast.error('Failed to update enrollment.');
      setTopics(prev => prev.map(t => t.id === topic.id ? { ...t, toggling: false } : t));
    }
  }

  const enrolledCount = topics.filter(t => t.enrolled).length;

  const DIFFICULTY_COLORS: Record<string, string> = {
    Beginner: 'bg-emerald-100 text-emerald-700',
    Intermediate: 'bg-amber-100 text-amber-700',
    Advanced: 'bg-red-100 text-red-700',
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="fixed right-0 top-0 h-full z-50 w-full max-w-md bg-white shadow-2xl flex flex-col animate-slide-right">
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900 text-base">Pick Topics</h2>
            <p className="text-xs text-gray-400 mt-0.5">
              From <span className="font-semibold text-violet-600">{subjectName}</span>
              {' '}· {topics.length} unassigned topics available
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1 bg-gray-100">
          <div
            className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500"
            style={{ width: topics.length > 0 ? `${(enrolledCount / topics.length) * 100}%` : '0%' }}
          />
        </div>

        {/* Topics list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-violet-500" size={28} />
            </div>
          ) : topics.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-20" />
              <p className="text-sm">No topics found in this subject</p>
            </div>
          ) : (
            topics.map((topic) => (
              <button
                key={topic.id}
                onClick={() => handleToggle(topic)}
                disabled={topic.toggling}
                className={`w-full p-4 rounded-xl border-2 transition-all text-left flex items-start gap-3 ${
                  topic.enrolled
                    ? 'border-violet-400 bg-violet-50'
                    : 'border-gray-100 bg-white hover:border-violet-200 hover:bg-violet-50/40'
                }`}
              >
                <div className="mt-0.5 flex-shrink-0">
                  {topic.toggling ? (
                    <Loader2 size={18} className="animate-spin text-violet-500" />
                  ) : topic.enrolled ? (
                    <CheckCircle2 size={18} className="text-violet-600" />
                  ) : (
                    <Circle size={18} className="text-gray-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{topic.title}</span>
                    {topic.difficulty_level && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[topic.difficulty_level] ?? 'bg-gray-100 text-gray-600'}`}>
                        {topic.difficulty_level}
                      </span>
                    )}
                  </div>
                  {topic.description && (
                    <p className="text-xs text-gray-500 line-clamp-2">{topic.description}</p>
                  )}
                  {(topic.estimated_hours ?? 0) > 0 && (
                    <p className="text-xs text-gray-400 mt-1">~{topic.estimated_hours}h estimated</p>
                  )}
                </div>
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="w-full py-3 bg-violet-600 text-white font-bold rounded-xl hover:bg-violet-700 transition-colors text-sm"
          >
            Done · {enrolledCount} topics selected
          </button>
        </div>
      </div>
    </>
  );
}
