import { create } from 'zustand';
import type { AiInboxItem, Child, LearningTask, Subject, Topic } from '../types';

interface AppState {
  children: Child[];
  subjects: Subject[];
  topics: Topic[];
  tasks: LearningTask[];
  aiInbox: AiInboxItem[];
  selectedChildId?: string;
  setSelectedChildId: (childId: string) => void;
  addAiInboxItem: (item: AiInboxItem) => void;
  upsertTask: (task: LearningTask) => void;
  completeTask: (taskId: string) => void;
}

const now = new Date().toISOString();

export const useAppStore = create<AppState>((set) => ({
  children: [
    {
      id: 'child-1',
      name: 'Avery',
      gradeLevel: 'Grade 4',
      createdAt: now,
    },
  ],
  subjects: [
    {
      id: 'subject-1',
      childId: 'child-1',
      name: 'Science',
    },
  ],
  topics: [
    {
      id: 'topic-1',
      subjectId: 'subject-1',
      title: 'Plant Life Cycles',
      description: 'Seeds, germination, pollination, and growth.',
    },
  ],
  tasks: [
    {
      id: 'task-1',
      topicId: 'topic-1',
      title: 'Draw and label the parts of a flower',
      status: 'in_progress',
      updatedAt: now,
    },
  ],
  aiInbox: [],
  selectedChildId: 'child-1',
  setSelectedChildId: (childId) => set({ selectedChildId: childId }),
  addAiInboxItem: (item) => set((state) => ({ aiInbox: [item, ...state.aiInbox] })),
  upsertTask: (task) =>
    set((state) => ({
      tasks: state.tasks.some((existing) => existing.id === task.id)
        ? state.tasks.map((existing) => (existing.id === task.id ? task : existing))
        : [task, ...state.tasks],
    })),
  completeTask: (taskId) =>
    set((state) => ({
      tasks: state.tasks.map((task) =>
        task.id === taskId
          ? { ...task, status: 'completed', updatedAt: new Date().toISOString() }
          : task,
      ),
    })),
}));
