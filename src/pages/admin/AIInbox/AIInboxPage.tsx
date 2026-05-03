import { CheckCircle2, Wand2 } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardHeader } from '../../../components/Card/AdminCard';
import { Button } from '../../../components/UI/Button';
import { EmptyState } from '../../../components/UI/EmptyState';
import { Loader } from '../../../components/UI/Loader';
import { Toast } from '../../../components/UI/Toast';
import { getAll, update } from '../../../services/supabaseService';
import { useAdminStore } from '../../../store/useAdminStore';

export function AIInboxPage() {
  const [items, setItems] = useState<Record<string, unknown>[]>([]);
  const [search, setSearch] = useState('');
  const { loading, setLoading, showToast } = useAdminStore();

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await getAll<Record<string, unknown>>('ai_inbox'));
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to load inbox', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [setLoading, showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => String(item.topic ?? '').toLowerCase().includes(search.toLowerCase()));
  }, [items, search]);

  async function markSaved(item: Record<string, unknown>) {
    try {
      await update('ai_inbox', String(item.id), { saved: true });
      showToast({ message: 'Marked as saved', type: 'success' });
      loadData();
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : 'Unable to update inbox item', type: 'error' });
    }
  }

  return (
    <div className="space-y-4 pb-20">
      <div>
        <h1 className="text-2xl font-semibold text-ink">AI Inbox</h1>
        <p className="mt-1 text-sm text-ink/65">Review generated lessons before turning them into curriculum.</p>
      </div>

      <input
        className="w-full rounded-md border border-black/15 bg-white px-3 py-2 text-sm outline-none focus:border-moss focus:ring-2 focus:ring-moss/20"
        onChange={(event) => setSearch(event.target.value)}
        placeholder="Search AI inbox"
        value={search}
      />

      {loading ? (
        <Loader />
      ) : filteredItems.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredItems.map((item) => {
            const lessonPreview = JSON.stringify(item.lesson ?? {}, null, 2);

            return (
              <Card key={String(item.id)}>
                <CardHeader title={String(item.topic ?? 'Untitled topic')} subtitle={lessonPreview.slice(0, 140)} />
                <div className="mt-3">
                  <span className="rounded-md bg-skywash px-2 py-1 text-xs font-semibold text-ink">
                    {item.saved ? 'Saved' : 'Not saved'}
                  </span>
                </div>
                <div className="mt-4 flex flex-col gap-2 border-t border-black/10 pt-3">
                  <Button
                    disabled={Boolean(item.saved)}
                    icon={<CheckCircle2 size={16} />}
                    onClick={(event) => {
                      event.stopPropagation();
                      markSaved(item);
                    }}
                    type="button"
                    variant="secondary"
                  >
                    Mark as saved
                  </Button>
                  <Button
                    icon={<Wand2 size={16} />}
                    onClick={(event) => {
                      event.stopPropagation();
                      showToast({ message: 'Convert flow placeholder is ready for future setup', type: 'success' });
                    }}
                    type="button"
                    variant="ghost"
                  >
                    Convert to Topic/Task
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Toast />
    </div>
  );
}
