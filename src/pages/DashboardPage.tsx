import { LessonGenerator } from '../components/LessonGenerator';
import { TaskCard } from '../components/TaskCard';
import { enqueueSync, saveTaskOffline } from '../offline/localStorageService';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';
import type { LearningTask } from '../types';

export function DashboardPage() {
  const { children, subjects, topics, tasks, completeTask } = useAppStore();

  async function handleComplete(task: LearningTask) {
    const completedTask = {
      ...task,
      status: 'completed' as const,
      updatedAt: new Date().toISOString(),
    };

    completeTask(task.id);
    await saveTaskOffline(completedTask);

    try {
      await api.completeTask(task.id);
    } catch {
      await enqueueSync({
        endpoint: '/api/tasks/complete',
        method: 'PATCH',
        payload: { id: task.id },
      });
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-md bg-skywash p-5">
        <p className="text-sm font-medium text-moss">Today</p>
        <h1 className="mt-1 text-2xl font-semibold text-ink">Learning dashboard</h1>
        <p className="mt-2 max-w-2xl text-ink/70">
          Track each child’s curriculum from subject to topic to task, with offline progress capture.
        </p>
      </section>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Children" value={children.length} />
        <Metric label="Subjects" value={subjects.length} />
        <Metric label="Open tasks" value={tasks.filter((task) => task.status !== 'completed').length} />
      </div>

      <LessonGenerator />

      <section>
        <div className="mb-3">
          <h2 className="text-lg font-semibold text-ink">Curriculum</h2>
          <p className="text-sm text-ink/60">
            {subjects[0]?.name} → {topics[0]?.title}
          </p>
        </div>
        <div className="space-y-3">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onComplete={handleComplete} />
          ))}
        </div>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border border-black/10 bg-white p-4">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-ink">{value}</p>
    </div>
  );
}
