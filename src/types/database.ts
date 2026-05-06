// ============================================================
// Database types — match Supabase schema exactly
// ============================================================

export type LearningStage =
  | 'Not_Started'
  | 'Introduced'
  | 'Practicing'
  | 'Comfortable'
  | 'Confident'
  | 'Needs_Practice';

// ── Raw DB rows ──────────────────────────────────────────────
export interface DbProfile {
  id: string;
  display_name: string | null;
  is_admin: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbChild {
  id: string;
  user_id: string;
  name: string;
  grade_level: string;
  date_of_birth: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbSubject {
  id: string;
  child_id: string;
  name: string;
  description: string | null;
  color: string;          // hex color, e.g. "#3f6b57"
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTopic {
  id: string;
  subject_id: string;
  title: string;
  description: string | null;
  difficulty_level: string | null;
  age_group: string | null;
  is_active: boolean;
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface DbTask {
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

export interface DbTaskProgress {
  id: string;
  child_id: string;
  task_id: string;
  learning_stage: LearningStage;
  interest_level: string | null;
  learned_count: number;
  target_count: number;
  last_practiced_at: string | null;
  next_due_at: string | null;
  repeat_interval: number | null;
  is_scheduled_this_week: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbActivity {
  id: string;
  task_id: string;
  name: string;
  type: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}
