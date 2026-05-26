import { CheckCircle2, Wand2, Sparkles, Calendar, BookOpen, Layers, Loader2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader } from '../../../components/Card/AdminCard';
import { Button }     from '../../../components/ui/Button';
import { EmptyState } from '../../../components/ui/EmptyState';
import { Loader }     from '../../../components/ui/Loader';
import { Toast }      from '../../../components/ui/Toast';
import { Modal }      from '../../../components/Modal/Modal';
import { getAll, insert, update } from '../../../services/supabaseService';
import { api }        from '../../../services/api';
import { useAdminStore } from '../../../store/useAdminStore';

export function AIInboxPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [subjects, setSubjects] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const { loading, setLoading, showToast } = useAdminStore();

  // State for AI Generation
  const [isGenModalOpen, setIsGenModalOpen] = useState(false);
  const [genTopicPrompt, setGenTopicPrompt] = useState('');
  const [generating, setGenerating] = useState(false);

  // State for Conversion Wizard
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [selectedInboxItem, setSelectedInboxItem] = useState<Record<string, any> | null>(null);
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [difficultyLevel, setDifficultyLevel] = useState('Intermediate');
  const [ageGroup, setAgeGroup] = useState('8-10');
  const [converting, setConverting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [inboxItems, dbSubjects] = await Promise.all([
        getAll<Record<string, unknown>>('ai_inbox'),
        getAll<Record<string, unknown>>('subjects'),
      ]);
      setItems(inboxItems);
      setSubjects(dbSubjects);
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to load data', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setLoading, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => String(item.topic ?? '').toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  async function markSaved(item: Record<string, unknown>) {
    try {
      await update('ai_inbox', String(item.id), { saved: true });
      showToast({ message: 'Marked as saved', type: 'success' });
      loadData();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to update inbox item', type: 'error' });
    }
  }

  async function handleGenerateLesson(e: React.FormEvent) {
    e.preventDefault();
    if (!genTopicPrompt.trim()) return;

    setGenerating(true);
    try {
      const response = await api.generateLesson(genTopicPrompt);
      if (!response.lesson) throw new Error('Failed to generate lesson from AI');

      // Insert lesson into Supabase
      await insert('ai_inbox', {
        topic: genTopicPrompt,
        lesson: response.lesson,
        saved: false,
      });

      showToast({ message: `Successfully generated lesson for "${genTopicPrompt}"`, type: 'success' });
      setIsGenModalOpen(false);
      setGenTopicPrompt('');
      loadData();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Failed to generate lesson', type: 'error' });
    } finally {
      setGenerating(false);
    }
  }

  async function handleConvertSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedInboxItem || !selectedSubjectId) {
      showToast({ message: 'Please select a subject', type: 'error' });
      return;
    }

    setConverting(true);
    try {
      const lesson = selectedInboxItem.lesson;

      // 1. Create a Topic
      const createdTopic = await insert<any>('topics', {
        subject_id: selectedSubjectId,
        title: lesson.title || selectedInboxItem.topic,
        description: lesson.summary || 'AI generated curriculum topic',
        difficulty_level: difficultyLevel,
        age_group: ageGroup || null,
        is_active: true,
        order_index: 0,
      });

      // 2. Create Core Objectives Task
      const objectivesList = Array.isArray(lesson.objectives)
        ? lesson.objectives.map((o: string) => `• ${o}`).join('\n')
        : '• Understand key concepts';

      const taskAPayload = {
        topic_id: createdTopic.id,
        name: 'Core Objectives',
        description: `### Objectives\n${objectivesList}\n\n### Assessment\n${lesson.assessment || 'Practiced and verified'}`,
        difficulty_level: difficultyLevel,
        age_group: ageGroup || null,
        source_type: 'ai_generated',
        order_index: 0,
        is_active: true,
      };
      await insert<any>('tasks', taskAPayload);

      // 3. Create Practice Activities Task
      const taskBPayload = {
        topic_id: createdTopic.id,
        name: 'Practice Activities',
        description: 'Complete the child activities list for practice.',
        difficulty_level: difficultyLevel,
        age_group: ageGroup || null,
        source_type: 'ai_generated',
        order_index: 1,
        is_active: true,
      };
      const createdTaskB = await insert<any>('tasks', taskBPayload);

      // 4. Create Child Activities
      if (Array.isArray(lesson.activities)) {
        for (let i = 0; i < lesson.activities.length; i++) {
          await insert('activities', {
            task_id: createdTaskB.id,
            name: lesson.activities[i],
            type: 'Practice',
            order_index: i,
            is_active: true,
          });
        }
      }

      // 5. Mark Inbox item as saved
      await update('ai_inbox', selectedInboxItem.id, { saved: true });

      showToast({ message: `Converted successfully into Topic "${createdTopic.title}"!`, type: 'success' });
      setIsConvertModalOpen(false);
      setSelectedInboxItem(null);
      loadData();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Conversion failed', type: 'error' });
    } finally {
      setConverting(false);
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-ink">AI Inbox</h1>
          <p className="mt-1 text-sm text-ink/65">Review generated lessons before turning them into curriculum.</p>
        </div>
        <Button
          icon={<Sparkles size={16} />}
          onClick={() => setIsGenModalOpen(true)}
          className="bg-violet-600 hover:bg-violet-700 text-white font-bold shadow-sm"
        >
          Generate with AI
        </Button>
      </div>

      <input
        className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search AI inbox"
        value={search}
      />

      {loading ? (
        <Loader />
      ) : filteredItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const lessonPreview = JSON.stringify(item.lesson ?? {}, null, 2);

            return (
              <Card key={String(item.id)}>
                <CardHeader title={String(item.topic ?? 'Untitled topic')} subtitle={lessonPreview.slice(0, 140)} />
                <div className="mt-3">
                  <span className={`rounded-md px-2 py-1 text-xs font-semibold ${item.saved ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                    {item.saved ? 'Saved to Curriculum' : 'Pending Review'}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-black/10 pt-3">
                  <Button
                    disabled={Boolean(item.saved)}
                    icon={<CheckCircle2 size={16} />}
                    onClick={(event) => {
                      event.stopPropagation();
                      markSaved(item);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Mark as saved
                  </Button>
                  <Button
                    disabled={Boolean(item.saved)}
                    icon={<Wand2 size={16} />}
                    onClick={(event) => {
                      event.stopPropagation();
                      setSelectedInboxItem(item);
                      if (subjects.length > 0) {
                        setSelectedSubjectId(String(subjects[0].id));
                      }
                      setIsConvertModalOpen(true);
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Convert to Topic/Task
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* AI Generate Lesson Modal */}
      <Modal
        title="Generate Curriculum Lesson with AI"
        isOpen={isGenModalOpen}
        onClose={() => setIsGenModalOpen(false)}
      >
        <form onSubmit={handleGenerateLesson} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-ink/75 mb-1">
              Enter Topic keyword or prompt
            </label>
            <input
              type="text"
              required
              disabled={generating}
              placeholder="e.g. Photosynthesis, Ancient Rome, Fractions"
              className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20 disabled:opacity-50"
              value={genTopicPrompt}
              onChange={(e) => setGenTopicPrompt(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-ink/50 leading-relaxed">
              OpenAI will generate a custom homeschool lesson including core learning objectives, summary, assessment guidelines, and child practice activities.
            </p>
          </div>

          <div className="flex justify-end gap-2 border-t border-black/10 pt-4">
            <Button
              type="button"
              variant="secondary"
              disabled={generating}
              onClick={() => setIsGenModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={generating}
              icon={generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            >
              {generating ? 'Generating Lesson…' : 'Generate with AI'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Conversion Wizard Modal */}
      <Modal
        title="AI Conversion Wizard"
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
      >
        {selectedInboxItem && (
          <form onSubmit={handleConvertSubmit} className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-ink/80 mb-2">
                Save lesson "<span className="text-violet-600 font-bold">{selectedInboxItem.lesson?.title || selectedInboxItem.topic}</span>" into active homeschool curriculum:
              </p>
            </div>

            {/* Subject Select */}
            <div>
              <label className="block text-xs font-semibold text-ink/75 mb-1.5 flex items-center gap-1">
                <BookOpen size={12} className="text-violet-500" /> Target Subject
              </label>
              {subjects.length === 0 ? (
                <p className="text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-200">
                  No subjects found. Please create a Subject first under Subjects page before converting.
                </p>
              ) : (
                <select
                  required
                  disabled={converting}
                  className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20 disabled:opacity-50"
                  value={selectedSubjectId}
                  onChange={(e) => setSelectedSubjectId(e.target.value)}
                >
                  {subjects.map((s: any) => (
                    <option key={s.id} value={s.id}>
                      {s.emoji} {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Difficulty Level */}
              <div>
                <label className="block text-xs font-semibold text-ink/75 mb-1.5 flex items-center gap-1">
                  <Layers size={12} className="text-violet-500" /> Difficulty Level
                </label>
                <select
                  disabled={converting}
                  className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20 disabled:opacity-50"
                  value={difficultyLevel}
                  onChange={(e) => setDifficultyLevel(e.target.value)}
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                </select>
              </div>

              {/* Age Group */}
              <div>
                <label className="block text-xs font-semibold text-ink/75 mb-1.5 flex items-center gap-1">
                  <Calendar size={12} className="text-violet-500" /> Age Group
                </label>
                <input
                  type="text"
                  disabled={converting}
                  placeholder="e.g. 8-10, Teenager"
                  className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20 disabled:opacity-50"
                  value={ageGroup}
                  onChange={(e) => setAgeGroup(e.target.value)}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-black/10 pt-4">
              <Button
                type="button"
                variant="secondary"
                disabled={converting}
                onClick={() => setIsConvertModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={converting || subjects.length === 0}
                icon={converting ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              >
                {converting ? 'Converting curriculum…' : 'Convert and Save'}
              </Button>
            </div>
          </form>
        )}
      </Modal>

      <Toast />
    </div>
  );
}
