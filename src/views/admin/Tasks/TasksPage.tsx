import { AdminResourcePage } from '../AdminResourcePage';
import { ageGroupOptions, difficultyOptions } from '../adminOptions';
import type { AdminResourceConfig } from '../adminTypes';

const sourceTypeOptions = [
  { label: 'Manual', value: 'manual' },
  { label: 'AI generated', value: 'ai_generated' },
];

const config: AdminResourceConfig = {
  table: 'tasks',
  title: 'Tasks',
  description: 'Manage learning tasks attached to topics.',
  searchFields: ['name', 'description', 'difficulty_level', 'age_group', 'source_type'],
  filters: [
    { name: 'difficulty_level', label: 'Difficulty', options: difficultyOptions },
    { name: 'age_group', label: 'Age group', options: ageGroupOptions },
    { name: 'source_type', label: 'Source type', options: sourceTypeOptions },
  ],
  fields: [
    { name: 'topic_id', label: 'Topic', type: 'select', required: true },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'difficulty_level', label: 'Difficulty level', type: 'text' },
    { name: 'age_group', label: 'Age group', type: 'text' },
    { name: 'source_type', label: 'Source type', type: 'select', options: sourceTypeOptions },
    { name: 'order_index', label: 'Order index', type: 'number' },
  ],
  renderCard: (item, lookups) => ({
    title: String(item.name ?? 'Untitled task'),
    subtitle: lookups.topics[String(item.topic_id)] ?? 'No topic',
    badges: [String(item.difficulty_level ?? 'No difficulty'), String(item.source_type ?? 'No source')],
  }),
};

export function TasksPage() {
  return <AdminResourcePage config={config} />;
}
