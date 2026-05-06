import { supabase } from './supabase';

export type TableName = 'subjects' | 'topics' | 'tasks' | 'activities' | 'ai_inbox' | 'children';

export async function getAll<T>(table: TableName) {
  let query = supabase.from(table).select('*');

  query = query.eq('is_active', true);

  const { data, error } = await query.order('order_index', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as T[];
}

export async function insert<T>(table: TableName, data: Record<string, unknown>) {
  const payload = await withUserId(table, data);
  const { data: created, error } = await supabase.from(table).insert(payload).select('*').single();
  if (error) throw error;
  return created as T;
}

export async function update<T>(table: TableName, id: string, data: Record<string, unknown>) {
  const { data: updated, error } = await supabase.from(table).update(data).eq('id', id).select('*').single();
  if (error) throw error;
  return updated as T;
}

export async function softDelete(table: TableName, id: string) {
  const { error } = await supabase.from(table).update({ is_active: false }).eq('id', id);
  if (error) throw error;
}

async function withUserId(table: TableName, data: Record<string, unknown>) {
  if (!['children', 'ai_inbox'].includes(table) || data.user_id) {
    return data;
  }

  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) {
    throw new Error('Please sign in before creating records.');
  }

  const payload = {
    ...data,
    user_id: userData.user.id,
  };

  if (table === 'children' && !payload.family_id) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('family_id')
      .eq('id', userData.user.id)
      .single();

    if (!profile?.family_id) {
      throw new Error('Create your family workspace before adding children.');
    }

    return {
      ...payload,
      family_id: profile.family_id,
    };
  }

  return payload;
}
