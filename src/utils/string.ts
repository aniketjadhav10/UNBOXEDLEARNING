// ============================================================
// utils/string.ts — String utility functions (eliminates duplicates)
// ============================================================

/** Get 1-2 uppercase initials from a full name */
export function getInitials(name: string): string {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Truncate a string to maxLength with ellipsis */
export function truncate(str: string | null | undefined, maxLength: number): string {
  if (!str) return '';
  return str.length > maxLength ? `${str.slice(0, maxLength - 1)}…` : str;
}

/** Convert snake_case / Underscore_Case to Title Case */
export function toTitleCase(str: string): string {
  return str.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Normalise a difficulty string to Beginner | Intermediate | Advanced */
export function normalizeDifficulty(d: string | null): 'Beginner' | 'Intermediate' | 'Advanced' {
  if (!d) return 'Beginner';
  const l = d.toLowerCase();
  if (l.includes('inter') || l.includes('medium')) return 'Intermediate';
  if (l.includes('adv')   || l.includes('hard'))   return 'Advanced';
  return 'Beginner';
}

/** Map a subject name to a representative emoji */
export function subjectEmoji(name: string): string {
  const n = name.toLowerCase();
  if (n.includes('math'))                                                return '🔢';
  if (n.includes('science'))                                             return '🔬';
  if (n.includes('english') || n.includes('language') || n.includes('reading') || n.includes('writing')) return '📚';
  if (n.includes('history') || n.includes('social'))                    return '🏛️';
  if (n.includes('art')     || n.includes('creative'))                  return '🎨';
  if (n.includes('cod')     || n.includes('tech') || n.includes('computer')) return '💻';
  if (n.includes('music'))                                               return '🎵';
  if (n.includes('pe')      || n.includes('physical') || n.includes('sport')) return '⚽';
  if (n.includes('geo'))                                                 return '🌍';
  if (n.includes('bio'))                                                 return '🧬';
  if (n.includes('chem'))                                                return '⚗️';
  if (n.includes('phys'))                                                return '⚡';
  return '📖';
}
