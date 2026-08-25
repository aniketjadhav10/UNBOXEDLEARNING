import { AdminResourcePage } from '../AdminResourcePage';
import { ageGroupOptions, difficultyOptions } from '../adminOptions';
import type { AdminResourceConfig } from '../adminTypes';

const config: AdminResourceConfig = {
  table: 'topics',
  title: 'Topics',
  description: 'Organize topics inside subjects.',
  searchFields: ['title', 'description', 'difficulty_level', 'age_group'],
  filters: [
    { name: 'difficulty_level', label: 'Difficulty', options: difficultyOptions },
    { name: 'age_group', label: 'Age group', options: ageGroupOptions },
  ],
  fields: [
    { name: 'subject_id', label: 'Subject', type: 'select', required: true },
    { name: 'title', label: 'Title', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'difficulty_level', label: 'Difficulty level', type: 'text' },
    { name: 'age_group', label: 'Age group', type: 'text' },
    { name: 'order_index', label: 'Order index', type: 'number' },
  ],
  renderCard: (item, lookups) => ({
    title: String(item.title ?? 'Untitled topic'),
    subtitle: lookups.subjects[String(item.subject_id)] ?? 'No subject',
    badges: [String(item.difficulty_level ?? 'No difficulty'), String(item.age_group ?? 'No age group')],
  }),
};

export function TopicsPage() {
  return <AdminResourcePage config={config} />;
}
