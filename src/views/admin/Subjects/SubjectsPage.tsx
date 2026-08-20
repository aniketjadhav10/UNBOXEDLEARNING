import { AdminResourcePage } from '../AdminResourcePage';
import type { AdminResourceConfig } from '../adminTypes';

const config: AdminResourceConfig = {
  table: 'subjects',
  title: 'Subjects',
  description: 'Manage curriculum subjects for each child.',
  searchFields: ['name', 'description', 'color'],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'description', label: 'Description', type: 'textarea' },
    { name: 'color', label: 'Color', type: 'text' },
    { name: 'order_index', label: 'Order index', type: 'number' },
    { name: 'child_id', label: 'Child', type: 'select', required: true },
  ],
  renderCard: (item) => ({
    title: String(item.name ?? 'Untitled subject'),
    subtitle: String(item.description ?? ''),
    badges: [String(item.color ?? 'No color')],
    meta: `Order index: ${item.order_index ?? 0}`,
  }),
};

export function SubjectsPage() {
  return <AdminResourcePage config={config} />;
}
