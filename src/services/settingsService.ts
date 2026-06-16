import { supabase } from './supabase';
import type { DbSystemSetting } from '../types/database';

export async function fetchSystemSetting(key: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('system_settings')
    .select('value')
    .eq('key', key)
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.code === '42P01') {
      // Not found or table doesn't exist
      return null;
    }
    throw new Error(error.message);
  }
  return data?.value ?? null;
}

export async function upsertSystemSetting(key: string, value: string): Promise<void> {
  const { error } = await supabase
    .from('system_settings')
    .upsert({ key, value, updated_at: new Date().toISOString() }, { onConflict: 'key' });

  if (error) throw new Error(error.message);
}
