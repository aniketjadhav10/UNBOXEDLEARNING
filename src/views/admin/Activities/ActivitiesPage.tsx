import { AdminResourcePage } from '../AdminResourcePage';
import type { AdminResourceConfig } from '../adminTypes';

const config: AdminResourceConfig = {
  table: 'activities',
  title: 'Activities',
  description: 'Manage activities inside learning tasks.',
  searchFields: ['name', 'type'],
  fields: [
    { name: 'task_id', label: 'Task', type: 'select', required: true },
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'type', label: 'Type', type: 'text', required: true },
    { name: 'order_index', label: 'Order index', type: 'number' },
  ],
  renderCard: (item, lookups) => ({
    title: String(item.name ?? 'Untitled activity'),
    subtitle: lookups.tasks[String(item.task_id)] ?? 'No task',
    badges: [String(item.type ?? 'No type')],
  }),
};

export function ActivitiesPage() {
  return <AdminResourcePage config={config} />;
}
