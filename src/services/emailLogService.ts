import { supabase } from './supabase';
import type { DbEmailLog } from '../types/database';

export async function fetchEmailLogs(limit = 50): Promise<DbEmailLog[]> {
  const { data, error } = await supabase
    .from('email_logs')
    .select('*')
    .order('sent_at', { ascending: false })
    .limit(limit);

  if (error) {
    if (error.code === '42P01') {
      // Table doesn't exist yet, return empty array safely
      return [];
    }
    throw new Error(error.message);
  }
  return data as DbEmailLog[];
}
