import { Plus, Search, SlidersHorizontal } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardActions, CardHeader } from '../../components/Card/AdminCard';
import { AdminForm } from '../../components/Form/AdminForm';
import { Modal } from '../../components/Modal/Modal';
import { Button } from '../../components/UI/Button';
import { EmptyState } from '../../components/UI/EmptyState';
import { Loader } from '../../components/UI/Loader';
import { Toast } from '../../components/UI/Toast';
import { getAll, insert, softDelete, update } from '../../services/supabaseService';
import { useAdminStore } from '../../store/useAdminStore';
import type { AdminLookups, AdminResourceConfig } from './adminTypes';

interface AdminResourcePageProps {
  config: AdminResourceConfig;
}

export function AdminResourcePage({ config }: AdminResourcePageProps) {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [lookups, setLookups] = useState<AdminLookups>({ children: {}, subjects: {}, topics: {}, tasks: {} });
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>({});
  const {
    closeDelete,
    closeForm,
    isDeleteOpen,
    isFormOpen,
    loading,
    openDelete,
    openForm,
    selectedItem,
    setLoading,
    showToast,
  } = useAdminStore();

  const fields = useMemo(() => {
    return config.fields.map((field) => {
      if (field.name === 'child_id') return { ...field, options: toOptions(lookups.children) };
      if (field.name === 'subject_id') return { ...field, options: toOptions(lookups.subjects) };
      if (field.name === 'topic_id') return { ...field, options: toOptions(lookups.topics) };
      if (field.name === 'task_id') return { ...field, options: toOptions(lookups.tasks) };
      return field;
    });
  }, [config.fields, lookups]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [records, children, subjects, topics, tasks] = await Promise.all([
        getAll<Record<string, unknown>>(config.table),
        getAll<Record<string, unknown>>('children'),
        getAll<Record<string, unknown>>('subjects'),
        getAll<Record<string, unknown>>('topics'),
        getAll<Record<string, unknown>>('tasks'),
      ]);

      setItems(records);
      setLookups({
        children: toLookup(children, 'name'),
        subjects: toLookup(subjects, 'name'),
        topics: toLookup(topics, 'title'),
        tasks: toLookup(tasks, 'name'),
      });
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to load records', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [config.table, setLoading, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const query = search.trim().toLowerCase();
        if (!query) return true;
        return config.searchFields.some((field) => String(item[field] ?? '').toLowerCase().includes(query));
      })
      .filter((item) =>
        Object.entries(filters).every(([field, value]) => !value || String(item[field] ?? '') === value),
      )
      .sort((a, b) => Number(a.order_index ?? 0) - Number(b.order_index ?? 0));
  }, [config.searchFields, filters, items, search]);

  async function handleSave(values: Record<string, unknown>) {
    try {
      if (selectedItem?.id) {
        await update(config.table, String(selectedItem.id), values);
        showToast({ message: 'Record updated', type: 'success' });
      } else {
        await insert(config.table, { ...values, is_active: true });
        showToast({ message: 'Record added', type: 'success' });
      }
      closeForm();
      loadData();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to save record', type: 'error' });
    }
  }

  async function handleDelete() {
    if (!selectedItem?.id) return;

    try {
      await softDelete(config.table, String(selectedItem.id));
      showToast({ message: 'Record deleted', type: 'success' });
      closeDelete();
      loadData();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to delete record', type: 'error' });
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-semibold text-ink">{config.title}</h1>
        <p className="mt-1 text-sm text-ink/65">{config.description}</p>
      </div>

      <div className="space-y-3 rounded-md bg-white p-3 shadow-sm">
        <label className="flex items-center gap-2 rounded-md border border-black/15 px-3 py-2">
          <Search size={18} className="text-ink/50" />
          <input
            className="w-full bg-transparent text-sm outline-none"
            onChange={(event) => setSearch(event.target.value)}
            placeholder={`Search ${config.title.toLowerCase()}`}
            value={search}
          />
        </label>

        {config.filters?.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {config.filters.map((filter) => (
              <label key={filter.name} className="flex items-center gap-2 rounded-md border border-black/15 px-3 py-2">
                <SlidersHorizontal size={16} className="text-ink/50" />
                <select
                  className="w-full bg-transparent text-sm outline-none"
                  onChange={(event) => setFilters((current) => ({ ...current, [filter.name]: event.target.value }))}
                  value={filters[filter.name] ?? ''}
                >
                  <option value="">{filter.label}</option>
                  {filter.options.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        ) : null}
      </div>

      {loading ? (
        <Loader />
      ) : filteredItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const card = config.renderCard(item, lookups);

            return (
              <Card key={String(item.id)} onClick={() => openForm(item)}>
                <CardHeader title={card.title} subtitle={card.subtitle} />
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.badges.map((badge) => (
                    <span key={badge} className="rounded-md bg-skywash px-2 py-1 text-xs font-semibold text-ink">
                      {badge}
                    </span>
                  ))}
                </div>
                {card.meta && <p className="mt-3 text-sm text-ink/60">{card.meta}</p>}
                <CardActions onDelete={() => openDelete(item)} onEdit={() => openForm(item)} />
              </Card>
            );
          })}
        </div>
      )}

      <Button
        className="fixed bottom-5 right-5 z-30 h-14 w-14 rounded-full p-0 shadow-xl"
        icon={<Plus size={24} />}
        onClick={() => openForm()}
        type="button"
      >
        <span className="sr-only">Add</span>
      </Button>

      <Modal
        isOpen={isFormOpen}
        onClose={closeForm}
        title={selectedItem ? `Edit ${config.title.slice(0, -1)}` : `Add ${config.title.slice(0, -1)}`}
      >
        <AdminForm
          fields={fields}
          initialValues={selectedItem}
          onCancel={closeForm}
          onSubmit={handleSave}
          submitLabel={selectedItem ? 'Save changes' : 'Add record'}
        />
      </Modal>

      <Modal isOpen={isDeleteOpen} onClose={closeDelete} title="Delete record">
        <p className="text-sm text-ink/70">This hides the record by setting it inactive. It can be restored from the database later.</p>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button onClick={closeDelete} type="button" variant="secondary">
            Cancel
          </Button>
          <Button onClick={handleDelete} type="button" variant="danger">
            Delete
          </Button>
        </div>
      </Modal>

      <Toast />
    </div>
  );
}

function toLookup(items: Record<string, unknown>[], labelField: string) {
  return items.reduce<Record<string, string>>((acc, item) => {
    if (item.id) acc[String(item.id)] = String(item[labelField] ?? 'Untitled');
    return acc;
  }, {});
}

function toOptions(lookup: Record<string, string>) {
  return Object.entries(lookup).map(([value, label]) => ({ label, value }));
}
