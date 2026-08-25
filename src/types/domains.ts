// ============================================================
// domains.ts — the 7 whole-child (360°) development domains.
// Single source of truth for domain values, labels, and display.
// Keep the values in sync with the subjects.development_domain
// CHECK constraint (supabase/add_development_domain.sql).
// ============================================================

export type DevelopmentDomain =
  | 'academic'
  | 'social_emotional'
  | 'physical'
  | 'creative'
  | 'life_skills'
  | 'character'
  | 'digital';

export interface DomainMeta {
  value: DevelopmentDomain;
  label: string;
  emoji: string;
  description: string;
  /** Tailwind accent classes for cards/badges. */
  accent: string;
}

export const DEVELOPMENT_DOMAINS: DomainMeta[] = [
  { value: 'academic',         label: 'Academic',          emoji: '📚', description: 'Reading, math, science, core knowledge',   accent: 'bg-violet-100 text-violet-700' },
  { value: 'social_emotional', label: 'Social-Emotional',  emoji: '💛', description: 'Empathy, self-regulation, relationships',   accent: 'bg-rose-100 text-rose-700' },
  { value: 'physical',         label: 'Physical & Motor',  emoji: '🤸', description: 'Movement, coordination, health',            accent: 'bg-emerald-100 text-emerald-700' },
  { value: 'creative',         label: 'Creative & Arts',   emoji: '🎨', description: 'Art, music, imagination, expression',       accent: 'bg-amber-100 text-amber-700' },
  { value: 'life_skills',      label: 'Life Skills',       emoji: '🧭', description: 'Practical, independence, everyday skills',  accent: 'bg-sky-100 text-sky-700' },
  { value: 'character',        label: 'Character & Values',emoji: '🌟', description: 'Integrity, responsibility, values',         accent: 'bg-indigo-100 text-indigo-700' },
  { value: 'digital',          label: 'Digital Literacy',  emoji: '💻', description: 'Technology, safety, digital fluency',       accent: 'bg-teal-100 text-teal-700' },
];

const BY_VALUE: Record<string, DomainMeta> = Object.fromEntries(
  DEVELOPMENT_DOMAINS.map((d) => [d.value, d]),
);

/** Resolve a (possibly missing/legacy) domain value to its metadata, defaulting to Academic. */
export function domainMeta(value: string | null | undefined): DomainMeta {
  return (value && BY_VALUE[value]) || DEVELOPMENT_DOMAINS[0];
}
