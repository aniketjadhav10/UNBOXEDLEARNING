// ============================================================
// domainService — subjects grouped by 360° development domain.
// Uses select('*') so it degrades gracefully if the
// development_domain column hasn't been added yet (defaults to
// 'academic' via domainMeta).
// ============================================================
import { supabase } from './supabase';
import { cachedQuery } from './cacheService';

export interface DomainSubject {
  id: string;
  name: string;
  development_domain: string;
}

export async function fetchDomainSubjects(): Promise<DomainSubject[]> {
  return cachedQuery('domains:subjects', async () => {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      development_domain: (s as { development_domain?: string }).development_domain ?? 'academic',
    }));
  });
}
