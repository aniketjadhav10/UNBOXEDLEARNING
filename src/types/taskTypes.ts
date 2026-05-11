// ============================================================
// Task Management — TypeScript Interfaces
// Matches Supabase: task + task_progress tables
// ============================================================

export type LearningStage =
  | 'Not_Started'
  | 'Introduced'
  | 'Practicing'
  | 'Comfortable'
  | 'Confident'
  | 'Needs_Practice';

export type InterestLevel = 1 | 2 | 3 | 4 | 5;

// DB uses number | null for interval
export type RepeatInterval = number | null;

export type TaskSortKey = 'next_due_at' | 'progress' | 'last_practiced_at' | 'interest_level';

// ── Raw Supabase row: tasks ──────────────────────────────────
export interface SupabaseTask {
  id: string;
  topic_id: string;
  name: string;
  description: string | null;
  difficulty_level: string | null;
  age_group: string | null;
  source_type: 'manual' | 'ai_generated';
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// ── Raw Supabase row: task_progress ──────────────────────────
export interface SupabaseTaskProgress {
  id: string;
  child_id: string;
  task_id: string;
  learning_stage: LearningStage;
  interest_level: number | null;
  learned_count: number;
  target_count: number;
  last_practiced_at: string | null;
  next_due_at: string | null;
  repeat_interval: number | null;
  is_scheduled_this_week: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  notes?: string | null; // Added notes if needed, or check if it exists in DB
}

// ── Combined view model used in UI ───────────────────────────
export interface TaskWithProgress extends SupabaseTask {
  progress: SupabaseTaskProgress | null;
  // Derived fields (computed client-side)
  progressPercent: number;
  isOverdue: boolean;
  isDueToday: boolean;
  isInactive: boolean; // not practiced in >14 days
  masteryPredictionDays?: number; // estimated days to mastery
  recommendedAction: string;
}

// ── Filter state ──────────────────────────────────────────────
export interface TaskFilter {
  subject: string;          // '' = all
  stage: LearningStage | ''; // '' = all
  dueToday: boolean;
  overdue: boolean;
  scheduledThisWeek: boolean;
  interestLevel: InterestLevel | 0; // 0 = all
}

// ── Dashboard summary data ────────────────────────────────────
export interface DashboardSummary {
  dueTodayCount: number;
  overdueCount: number;
  masteredCount: number;
  scheduledThisWeekCount: number;
  avgInterestLevel: number;
  consistencyScore: number; // 0-100
}

// ── Task action payloads ──────────────────────────────────────
export interface UpdateProgressPayload {
  task_id: string;
  learning_stage?: LearningStage;
  interest_level?: InterestLevel;
  learned_count?: number;
  next_due_at?: string;
  notes?: string;
}
