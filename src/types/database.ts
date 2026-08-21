// ============================================================
// database.ts — Complete DB types reflecting new architecture
// ============================================================

export type LearningStage =
  | 'Not_Started'
  | 'Introduced'
  | 'Practicing'
  | 'Comfortable'
  | 'Confident'
  | 'Needs_Practice';

export type EnrollmentSource = 'manual' | 'subject' | 'ai_suggest';
export type TaskType = 'lesson' | 'quiz' | 'project' | 'reading' | 'worksheet' | 'experiment' | 'discussion';
export type SubjectType = 'core' | 'elective' | 'enrichment';

// ── Raw DB rows ──────────────────────────────────────────────
export interface DbProfile {
  id: string;
  display_name: string | null;
  family_id: string | null;
  is_admin: boolean;
  preferences: Record<string, any> | null;
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

// ── Enrollment Junction Tables ───────────────────────────────

export interface DbChildSubject {
  id: string;
  child_id: string;
  subject_id: string;
  enrolled_at: string;
  is_active: boolean;
  custom_order: number;
}

export interface DbChildTopic {
  id: string;
  child_id: string;
  topic_id: string;
  enrolled_at: string;
  is_active: boolean;
  enrollment_source: EnrollmentSource;
  custom_order: number;
  target_completion_date: string | null;
}

// ── Lesson planning / scheduling ─────────────────────────────
export type SessionStatus = 'planned' | 'in_progress' | 'completed' | 'skipped';

export interface DbLessonPlan {
  id: string;
  child_id: string;
  title: string;
  week_start_date: string | null;
  status: 'active' | 'archived';
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbScheduledSession {
  id: string;
  plan_id: string | null;
  child_id: string;
  task_id: string | null;
  topic_id: string | null;
  scheduled_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  status: SessionStatus;
  notes: string | null;
  completed_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

// ── Assessment / submissions ─────────────────────────────────
export type SubmissionStatus = 'submitted' | 'grading' | 'graded' | 'returned';

export interface DbSubmission {
  id: string;
  child_id: string;
  task_id: string;
  session_id: string | null;
  content: string | null;
  attachment_url: string | null;
  status: SubmissionStatus;
  submitted_by: string | null;
  submitted_at: string;
  created_at: string;
  updated_at: string;
}

export interface DbAssessmentResult {
  id: string;
  submission_id: string;
  score: number | null;
  max_score: number;
  passed: boolean | null;
  feedback: string | null;
  rubric: unknown;
  graded_by: 'ai' | 'parent';
  grader_id: string | null;
  created_at: string;
  updated_at: string;
}

// ── Global Content Tables ────────────────────────────────────

export interface DbSubject {
  id: string;
  name: string;
  description: string | null;
  color: string;
  order_index: number;
  is_active: boolean;
  embedding: number[] | null;
  // New fields (Phase 1)
  created_by: string | null;
  is_global: boolean;
  grade_levels: string[];
  subject_type: SubjectType;
  estimated_weeks: number | null;
  tags: string[];
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
  embedding: number[] | null;
  // New fields (Phase 1)
  learning_objectives: string[] | null;
  prerequisites: string[] | null;
  estimated_hours: number | null;
  bloom_level: string | null;
  keywords: string[] | null;
  grade_level_range: string | null;
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
  embedding: number[] | null;
  // New fields (Phase 1)
  task_type: TaskType;
  instructions: string | null;
  parent_guide: string | null;
  materials_needed: string[] | null;
  estimated_minutes: number;
  learning_objective: string | null;
  assessment_criteria: string | null;
  resources: Array<{ type: string; url: string; title: string }>;
  is_assessment: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbTaskProgress {
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
  // New fields (Phase 1)
  notes: string | null;
  session_count: number;
  time_spent_minutes: number;
  mastery_score: number | null;
  parent_rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface DbActivity {
  id: string;
  task_id: string;
  name: string;
  type: string | null;
  materials: string[] | null;
  order_index: number;
  is_active: boolean;
  // New fields (Phase 1)
  instructions: string | null;
  activity_type: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbEmailLog {
  id: string;
  sent_at: string;
  status: 'success' | 'failed';
  error_message: string | null;
  recipient: string | null;
  tasks_learned_count: number | null;
  tasks_pending_count: number | null;
}

export interface DbSystemSetting {
  id: string;
  key: string;
  value: string;
  updated_at: string;
}

// ── Enriched joined types (for UI usage) ─────────────────────

/** Topic with its parent subject breadcrumb info */
export interface DbTopicWithBreadcrumb extends DbTopic {
  subject: Pick<DbSubject, 'id' | 'name' | 'color'> & { emoji?: string };
  custom_order?: number;
  enrollment_source?: EnrollmentSource;
  target_completion_date?: string | null;
}

/** Task with its full breadcrumb: subject > topic > task */
export interface DbTaskWithBreadcrumb extends DbTask {
  topic: Pick<DbTopic, 'id' | 'title'> & {
    subject: Pick<DbSubject, 'id' | 'name' | 'color'>;
  };
}
