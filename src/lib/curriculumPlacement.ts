import type { DbChild, DbSubject, DbTask, DbTopic } from '../types/database';

const MONTH_MS = 1000 * 60 * 60 * 24 * 30.4375;

export interface ChildPlacement {
  age: number | null;
  grade: number | null;
  gradeLabel: string;
  ageGroup: string;
  summary: string;
}

export interface PlacementMatch {
  matches: boolean;
  label: string;
  reason: string;
}

export function calculateAge(dateOfBirth?: string | null): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const now = new Date();
  const months = Math.floor((now.getTime() - birth.getTime()) / MONTH_MS);
  if (months < 0) return null;
  return Math.floor(months / 12);
}

export function normalizeGradeLevel(value?: string | number | null): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' && Number.isFinite(value)) return value;

  const text = String(value).trim().toLowerCase();
  if (!text) return null;

  if (/nursery|pre[-\s]?nursery|playgroup|preschool/.test(text)) return -2;
  if (/\blkg\b|lower kindergarten|junior kg|jr\.?\s*kg/.test(text)) return -1;
  if (/\bukg\b|upper kindergarten|kindergarten|\bkg\b|\bk\b|senior kg|sr\.?\s*kg/.test(text)) return 0;

  const numeric = text.match(/(?:grade|class|std|standard)?\s*(\d{1,2})(?:st|nd|rd|th)?/);
  if (!numeric) return null;
  const grade = Number(numeric[1]);
  return Number.isFinite(grade) ? grade : null;
}

export function gradeLabel(value?: string | number | null): string {
  const grade = normalizeGradeLevel(value);
  if (grade === null) return 'No class set';
  if (grade <= -2) return 'Preschool';
  if (grade === -1) return 'LKG';
  if (grade === 0) return 'KG';
  return `Class ${grade}`;
}

export function getChildPlacement(child?: Pick<DbChild, 'date_of_birth' | 'grade_level'> | null): ChildPlacement {
  const age = calculateAge(child?.date_of_birth ?? null);
  const grade = normalizeGradeLevel(child?.grade_level ?? null);
  const estimatedAge = age ?? (grade !== null ? grade + 5 : null);
  const ageGroup = estimatedAge !== null ? `${Math.max(2, estimatedAge - 1)}-${Math.min(15, estimatedAge + 1)}` : 'All ages';
  const label = child?.grade_level ? gradeLabel(child.grade_level) : 'No class set';
  const summaryParts = [age !== null ? `Age ${age}` : null, label !== 'No class set' ? label : null].filter(Boolean);

  return {
    age,
    grade,
    gradeLabel: label,
    ageGroup,
    summary: summaryParts.length > 0 ? summaryParts.join(' · ') : 'All ages',
  };
}

function parseNumberRange(value?: string | null): [number, number] | null {
  if (!value) return null;
  const text = value.toLowerCase();
  const numbers = text.match(/\d{1,2}/g)?.map(Number).filter(Number.isFinite) ?? [];
  if (numbers.length === 0) return null;
  if (numbers.length === 1) return [numbers[0], numbers[0]];
  return [Math.min(numbers[0], numbers[1]), Math.max(numbers[0], numbers[1])];
}

function gradeRangeFromLabels(values: string[]): [number, number] | null {
  const grades = values
    .map(normalizeGradeLevel)
    .filter((grade): grade is number => grade !== null);
  if (grades.length === 0) return null;
  return [Math.min(...grades), Math.max(...grades)];
}

function rangeContains(range: [number, number] | null, value: number | null, tolerance = 0): boolean {
  if (!range || value === null) return true;
  return value >= range[0] - tolerance && value <= range[1] + tolerance;
}

function formatRange(prefix: string, range: [number, number] | null): string {
  if (!range) return 'All levels';
  if (range[0] === range[1]) return `${prefix} ${range[0]}`;
  return `${prefix} ${range[0]}-${range[1]}`;
}

function formatGradeRange(range: [number, number] | null): string {
  if (!range) return 'All classes';
  const labelFor = (grade: number) => {
    if (grade <= -2) return 'Preschool';
    if (grade === -1) return 'LKG';
    if (grade === 0) return 'KG';
    return `Class ${grade}`;
  };
  if (range[0] === range[1]) return labelFor(range[0]);
  return `${labelFor(range[0])}-${labelFor(range[1]).replace('Class ', '')}`;
}

export function getSubjectPlacementLabel(subject: Pick<DbSubject, 'grade_levels'>): string {
  const range = gradeRangeFromLabels(subject.grade_levels ?? []);
  return formatGradeRange(range);
}

export function getTopicPlacementLabel(topic: Pick<DbTopic, 'age_group' | 'grade_level_range'>): string {
  const gradeRange = parseNumberRange(topic.grade_level_range);
  if (gradeRange) return formatRange('Class', gradeRange);
  const ageRange = parseNumberRange(topic.age_group);
  if (ageRange) return formatRange('Age', ageRange);
  return 'All levels';
}

export function getTaskPlacementLabel(task: Pick<DbTask, 'age_group' | 'difficulty_level'>): string {
  const ageRange = parseNumberRange(task.age_group);
  if (ageRange) return formatRange('Age', ageRange);
  return task.difficulty_level || 'All levels';
}

export function isSubjectAppropriateForChild(subject: Pick<DbSubject, 'grade_levels'>, child?: DbChild | null): PlacementMatch {
  const placement = getChildPlacement(child);
  const range = gradeRangeFromLabels(subject.grade_levels ?? []);
  const label = getSubjectPlacementLabel(subject);

  if (!range || placement.grade === null) {
    return { matches: true, label, reason: placement.grade === null ? 'Shown because this child has no class set yet.' : `Fits ${placement.summary}.` };
  }

  const matches = rangeContains(range, placement.grade, 1);
  return {
    matches,
    label,
    reason: matches ? `Fits ${placement.summary}.` : `Usually for ${label}; selected child is ${placement.summary}.`,
  };
}

export function isTopicAppropriateForChild(topic: Pick<DbTopic, 'age_group' | 'grade_level_range'>, child?: DbChild | null): PlacementMatch {
  const placement = getChildPlacement(child);
  const gradeRange = parseNumberRange(topic.grade_level_range);
  const ageRange = parseNumberRange(topic.age_group);
  const label = getTopicPlacementLabel(topic);

  if (gradeRange && placement.grade !== null) {
    const matches = rangeContains(gradeRange, placement.grade, 1);
    return { matches, label, reason: matches ? `Fits ${placement.summary}.` : `Usually for ${label}; selected child is ${placement.summary}.` };
  }

  if (ageRange && placement.age !== null) {
    const matches = rangeContains(ageRange, placement.age, 1);
    return { matches, label, reason: matches ? `Fits ${placement.summary}.` : `Usually for ${label}; selected child is ${placement.summary}.` };
  }

  return { matches: true, label, reason: `Fits ${placement.summary}.` };
}

export function isTaskAppropriateForChild(task: Pick<DbTask, 'age_group' | 'difficulty_level'>, child?: DbChild | null): PlacementMatch {
  const placement = getChildPlacement(child);
  const ageRange = parseNumberRange(task.age_group);
  const label = getTaskPlacementLabel(task);

  if (!ageRange || placement.age === null) return { matches: true, label, reason: `Fits ${placement.summary}.` };

  const matches = rangeContains(ageRange, placement.age, 1);
  return { matches, label, reason: matches ? `Fits ${placement.summary}.` : `Usually for ${label}; selected child is ${placement.summary}.` };
}
