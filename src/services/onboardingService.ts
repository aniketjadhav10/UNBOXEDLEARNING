// ============================================================
// onboardingService — Thin service wrappers used by wizard steps
// ============================================================
import { supabase } from './supabase';
import { createItem } from './curriculumService';
import { createFamily, sendFamilyInvite } from './familyService';
import type { DbTask } from '../types/database';

// ── Family ────────────────────────────────────────────────────

/** Create a new family workspace. Returns the family id. */
export async function ensureFamily(name: string): Promise<string> {
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) throw new Error('Not authenticated. Please sign in again.');

  // ── 1. Ensure profiles row exists ────────────────────────────
  // For new Google OAuth users the profiles trigger can lag — insert-if-absent
  // so the FK is satisfied for all subsequent operations.
  await supabase
    .from('profiles')
    .upsert(
      { id: authUser.id, is_admin: true },
      { onConflict: 'id', ignoreDuplicates: true },
    );

  // ── 2. Save display_name from Google OAuth metadata ──────────
  // Supabase stores the Google name in user_metadata.full_name / .name.
  // Only update if the field is currently null so manual edits are kept.
  const googleName =
    (authUser.user_metadata?.full_name as string | undefined) ||
    (authUser.user_metadata?.name as string | undefined) ||
    authUser.email?.split('@')[0] ||
    null;

  if (googleName) {
    await supabase
      .from('profiles')
      .update({ display_name: googleName })
      .eq('id', authUser.id)
      .is('display_name', null); // only when still empty
  }

  // ── 3. Create family workspace ────────────────────────────────
  const family = await createFamily(name);

  // ── 4. Explicitly link profile → family ──────────────────────
  // The create_family_workspace RPC may update family_id, but it only does so
  // if the profiles row already existed when the RPC ran. We guarantee it here
  // regardless of RPC behaviour.
  const { error: linkErr } = await supabase
    .from('profiles')
    .update({ family_id: family.id })
    .eq('id', authUser.id);

  if (linkErr) {
    console.warn('[ensureFamily] Could not link family_id to profile:', linkErr.message);
  }

  return family.id;
}


// ── Child ─────────────────────────────────────────────────────

export interface ChildInput {
  name: string;
  grade_level: string;
  date_of_birth?: string;
}

/** Create a child profile. Returns the created child id. */
export async function addChild(userId: string, input: ChildInput): Promise<string> {
  // ── Ensure the profiles row exists ───────────────────────────
  // For new Google OAuth sign-ups, Supabase creates auth.users immediately
  // but the profiles trigger can lag or fail. children.user_id FK references
  // profiles(id), so we must guarantee the row exists first.
  // ignoreDuplicates: true means we never overwrite an existing profile.
  const { error: profileErr } = await supabase
    .from('profiles')
    .upsert(
      { id: userId, is_admin: true },
      { onConflict: 'id', ignoreDuplicates: true },
    );
  if (profileErr) {
    // Log but don't throw — the profile may already exist (trigger already ran)
    console.warn('[addChild] Profile upsert warning:', profileErr.message);
  }

  // ── Insert child ─────────────────────────────────────────────
  const child = await createItem<{ id: string }>('children', {
    user_id: userId,
    name: input.name,
    grade_level: input.grade_level,
    date_of_birth: input.date_of_birth || null,
  });
  return child.id;
}

// ── Curriculum assignment ─────────────────────────────────────

/**
 * Assign an explicit list of task IDs to a child via a single Supabase RPC.
 * Uses ON CONFLICT DO NOTHING so already-assigned tasks are skipped cleanly.
 * Returns { assigned, skipped } counts.
 */
export async function assignTasksToChild(
  taskIds: string[],
  childId: string,
): Promise<{ assigned: number; skipped: number }> {
  if (taskIds.length === 0) return { assigned: 0, skipped: 0 };

  const { data, error } = await supabase.rpc('assign_tasks_to_child', {
    p_task_ids: taskIds,
    p_child_id: childId,
  });
  if (error) throw error;
  return data as { assigned: number; skipped: number };
}

/**
 * Convenience wrapper — assigns all active tasks under the given subjects.
 * Resolves subject → topic → task IDs server-side, then calls assignTasksToChild.
 */
export async function assignSubjectsToChild(
  subjectIds: string[],
  childId: string,
): Promise<{ assigned: number; skipped: number }> {
  if (subjectIds.length === 0) return { assigned: 0, skipped: 0 };

  const { data: topics, error: topicErr } = await supabase
    .from('topics')
    .select('id')
    .in('subject_id', subjectIds)
    .eq('is_active', true);
  if (topicErr) throw topicErr;
  if (!topics || topics.length === 0) return { assigned: 0, skipped: 0 };

  const topicIds = topics.map((t: { id: string }) => t.id);

  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('id')
    .in('topic_id', topicIds)
    .eq('is_active', true);
  if (taskErr) throw taskErr;
  if (!tasks || tasks.length === 0) return { assigned: 0, skipped: 0 };

  return assignTasksToChild(tasks.map((t: { id: string }) => t.id), childId);
}

/**
 * Convenience wrapper — assigns all active tasks under the given topics.
 */
export async function assignTopicsToChild(
  topicIds: string[],
  childId: string,
): Promise<{ assigned: number; skipped: number }> {
  if (topicIds.length === 0) return { assigned: 0, skipped: 0 };

  const { data: tasks, error: taskErr } = await supabase
    .from('tasks')
    .select('id')
    .in('topic_id', topicIds)
    .eq('is_active', true);
  if (taskErr) throw taskErr;
  if (!tasks || tasks.length === 0) return { assigned: 0, skipped: 0 };

  return assignTasksToChild(tasks.map((t: { id: string }) => t.id), childId);
}

// ── Co-parent invite ──────────────────────────────────────────

export interface InviteResult {
  success: boolean;
  code?: string;
  emailSent?: boolean;
}

export async function inviteCoParent(email: string): Promise<InviteResult> {
  const result = await sendFamilyInvite(email);
  return {
    success: result.success ?? false,
    code: result.code,
    emailSent: result.emailSent ?? false,
  };
}

// ── Status check for OnboardingGuard ─────────────────────────

export interface OnboardingStatus {
  hasFamily: boolean;
  hasChild: boolean;
  hasSubjects: boolean;
}

export async function getOnboardingStatus(): Promise<OnboardingStatus> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { hasFamily: false, hasChild: false, hasSubjects: false };

  const [profileRes, childrenRes] = await Promise.all([
    supabase
      .from('profiles')
      .select('family_id')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('children')
      .select('id')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .limit(1),
  ]);

  const hasFamily = !!(profileRes.data?.family_id);
  const hasChild = (childrenRes.data?.length ?? 0) > 0;

  let hasSubjects = false;
  if (hasChild && childrenRes.data?.[0]) {
    const { data: subjects } = await supabase
      .from('subjects')
      .select('id')
      .eq('child_id', childrenRes.data[0].id)
      .eq('is_active', true)
      .limit(1);
    hasSubjects = (subjects?.length ?? 0) > 0;
  }

  return { hasFamily, hasChild, hasSubjects };
}
