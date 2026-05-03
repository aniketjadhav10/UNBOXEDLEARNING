import { AdminResourcePage } from '../AdminResourcePage';
import type { AdminResourceConfig } from '../adminTypes';

const config: AdminResourceConfig = {
  table: 'children',
  title: 'Children',
  description: 'Manage child profiles used by subjects and curriculum planning.',
  searchFields: ['name', 'grade_level'],
  fields: [
    { name: 'name', label: 'Name', type: 'text', required: true },
    { name: 'grade_level', label: 'Grade level', type: 'text', required: true },
    { name: 'order_index', label: 'Order index', type: 'number' },
  ],
  renderCard: (item) => ({
    title: String(item.name ?? 'Unnamed child'),
    subtitle: String(item.grade_level ?? 'No grade level'),
    badges: [`Order index: ${item.order_index ?? 0}`],
  }),
};

export function ChildrenPage() {
  return <AdminResourcePage config={config} />;
}
