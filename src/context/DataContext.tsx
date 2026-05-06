// ============================================================
// DataContext — Fetches Supabase data only when authenticated.
// Re-fetches on auth session change (login / logout).
// ============================================================
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { supabase } from '../services/supabase';
import {
  avatarColor,
  colorToGradient,
  computeAge,
  computeSubjectProgress,
  fetchAllAppData,
  getInitials,
  isTopicCompleted,
  subjectEmoji,
} from '../services/dataService';
import type {
  DbChild,
  DbSubject,
  DbTask,
  DbTaskProgress,
  DbTopic,
  LearningStage,
} from '../types/database';

// ── App-level types (consumed by pages/components) ───────────

export interface AppKid {
  id: string;
  name: string;
  age: number;
  grade: string;
  avatarInitials: string;
  avatarColor: string;
  date_of_birth: string | null;
  learningStyle: string;
  interests: string[];
  favoriteSubjects: string[];
  parentName: string;
  bio: string;
  progress: {
    overall: number;
    subjectsEnrolled: number;
    activitiesCompleted: number;
    achievements: number;
  };
}

export interface AppSubject {
  id: string;
  childId: string;
  name: string;
  description: string;
  emoji: string;
  gradient: string;
  color: string;
  topicsCount: number;
  progress: number;
}

export interface AppTopic {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  duration: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  completed: boolean;
}

export interface AppTask {
  id: string;
  topicId: string;
  name: string;
  description: string;
  difficulty: string;
  stage: LearningStage | string;
  isScheduled: boolean;
}

// ── Context shape ─────────────────────────────────────────────

interface DataContextValue {
  kids: AppKid[];
  subjects: AppSubject[];
  topics: AppTopic[];
  tasks: AppTask[];
  taskProgress: DbTaskProgress[];
  // Raw DB rows (advanced usage)
  rawChildren: DbChild[];
  rawSubjects: DbSubject[];
  rawTopics: DbTopic[];
  rawTasks: DbTask[];
  // Status
  loading: boolean;
  error: string | null;
  isEmpty: boolean;
  refresh: () => void;
}

const DataContext = createContext<DataContextValue | null>(null);

// ── Helpers ───────────────────────────────────────────────────
function normalizeDifficulty(d: string | null): AppTopic['difficulty'] {
  if (!d) return 'Beginner';
  const l = d.toLowerCase();
  if (l.includes('inter') || l.includes('medium')) return 'Intermediate';
  if (l.includes('adv')   || l.includes('hard'))   return 'Advanced';
  return 'Beginner';
}

// ── Provider ──────────────────────────────────────────────────
export function DataProvider({ children }: { children: ReactNode }) {
  const [rawChildren,   setRawChildren]   = useState<DbChild[]>([]);
  const [rawSubjects,   setRawSubjects]   = useState<DbSubject[]>([]);
  const [rawTopics,     setRawTopics]     = useState<DbTopic[]>([]);
  const [rawTasks,      setRawTasks]      = useState<DbTask[]>([]);
  const [taskProgress,  setTaskProgress]  = useState<DbTaskProgress[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    // ── Guard: only fetch when a Supabase session exists ──────
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      // User is not authenticated → AppRoutes will show LoginPage
      setLoading(false);
      return;
    }

    try {
      const result = await fetchAllAppData();
      setRawChildren(result.children);
      setRawSubjects(result.subjects);
      setRawTopics(result.topics);
      setRawTasks(result.tasks);
      setTaskProgress(result.taskProgress);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to load data from Supabase');
    } finally {
      setLoading(false);
    }
  }, []);

  // Re-fetch whenever the auth session changes (login / logout)
  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'SIGNED_IN')  load();
        if (event === 'SIGNED_OUT') {
          setRawChildren([]);
          setRawSubjects([]);
          setRawTopics([]);
          setRawTasks([]);
          setTaskProgress([]);
        }
      },
    );
    return () => subscription.unsubscribe();
  }, [load]);

  // ── Transform raw rows → app types ───────────────────────────

  const kids: AppKid[] = rawChildren.map((child, i) => {
    const childSubjects  = rawSubjects.filter((s) => s.child_id === child.id);
    const childProgress  = taskProgress.filter((p) => p.child_id === child.id);
    const completedTasks = childProgress.filter((p) =>
      ['Comfortable', 'Confident'].includes(p.learning_stage)
    ).length;

    const subjectProgresses = childSubjects.map((s) =>
      computeSubjectProgress(s.id, rawTopics, rawTasks, childProgress)
    );
    const overall = subjectProgresses.length > 0
      ? Math.round(subjectProgresses.reduce((a, b) => a + b, 0) / subjectProgresses.length)
      : 0;

    return {
      id:               child.id,
      name:             child.name,
      age:              computeAge(child.date_of_birth),
      grade:            child.grade_level,
      avatarInitials:   getInitials(child.name),
      avatarColor:      avatarColor(i),
      date_of_birth:    child.date_of_birth,
      learningStyle:    'Mixed',
      interests:        [],
      favoriteSubjects: childSubjects.slice(0, 2).map((s) => s.name),
      parentName:       'Parent',
      bio:              `${child.name} is enrolled in ${childSubjects.length} subject${childSubjects.length !== 1 ? 's' : ''}.`,
      progress: {
        overall,
        subjectsEnrolled:    childSubjects.length,
        activitiesCompleted: completedTasks,
        achievements:        Math.floor(completedTasks / 3),
      },
    };
  });

  const subjects: AppSubject[] = rawSubjects.map((s) => {
    const subjectTopics = rawTopics.filter((t) => t.subject_id === s.id);
    const progress = computeSubjectProgress(s.id, rawTopics, rawTasks, taskProgress);
    return {
      id:          s.id,
      childId:     s.child_id,
      name:        s.name,
      description: s.description ?? `Learn about ${s.name}.`,
      emoji:       subjectEmoji(s.name),
      gradient:    colorToGradient(s.color),
      color:       s.color,
      topicsCount: subjectTopics.length,
      progress,
    };
  });

  const topics: AppTopic[] = rawTopics.map((t) => ({
    id:          t.id,
    subjectId:   t.subject_id,
    title:       t.title,
    description: t.description ?? '',
    duration:    'Self-paced',
    difficulty:  normalizeDifficulty(t.difficulty_level),
    completed:   isTopicCompleted(t.id, rawTasks, taskProgress),
  }));

  const tasks: AppTask[] = rawTasks.map((t) => {
    const prog = taskProgress.find((p) => p.task_id === t.id);
    return {
      id:          t.id,
      topicId:     t.topic_id,
      name:        t.name,
      description: t.description ?? '',
      difficulty:  t.difficulty_level ?? 'Beginner',
      stage:       prog?.learning_stage ?? 'Not_Started',
      isScheduled: prog?.is_scheduled_this_week ?? false,
    };
  });

  return (
    <DataContext.Provider
      value={{
        kids,
        subjects,
        topics,
        tasks,
        taskProgress,
        rawChildren,
        rawSubjects,
        rawTopics,
        rawTasks,
        loading,
        error,
        isEmpty: !loading && !error && rawChildren.length === 0,
        refresh: load,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used inside <DataProvider>');
  return ctx;
}
