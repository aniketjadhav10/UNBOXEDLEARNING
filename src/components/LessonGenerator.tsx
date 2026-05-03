import { Sparkles } from 'lucide-react';
import { FormEvent, useState } from 'react';
import { saveAiInboxItem } from '../offline/localStorageService';
import { api } from '../services/api';
import { useAppStore } from '../store/useAppStore';

export function LessonGenerator() {
  const [topic, setTopic] = useState('Plant Life Cycles');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const addAiInboxItem = useAppStore((state) => state.addAiInboxItem);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setStatus('loading');

    try {
      const { lesson } = await api.generateLesson(topic);
      const item = {
        id: crypto.randomUUID(),
        topic,
        lesson,
        createdAt: new Date().toISOString(),
        saved: false,
      };

      addAiInboxItem(item);
      await saveAiInboxItem(item);
      setStatus('success');
    } catch {
      setStatus('error');
    }
  }

  return (
    <section className="rounded-md border border-black/10 bg-white p-5">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="text-clay" aria-hidden="true" size={20} />
        <h2 className="text-lg font-semibold">Generate Lesson</h2>
      </div>
      <form onSubmit={handleSubmit} className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="sr-only" htmlFor="lesson-topic">
          Topic
        </label>
        <input
          id="lesson-topic"
          value={topic}
          onChange={(event) => setTopic(event.target.value)}
          className="rounded-md border border-black/15 px-3 py-2 outline-none focus:border-moss focus:ring-2 focus:ring-moss/20"
          placeholder="Enter a lesson topic"
        />
        <button
          type="submit"
          disabled={status === 'loading' || topic.trim().length < 2}
          className="rounded-md bg-ink px-4 py-2 font-medium text-white disabled:cursor-not-allowed disabled:bg-ink/40"
        >
          {status === 'loading' ? 'Generating' : 'Generate'}
        </button>
      </form>
      {status === 'success' && <p className="mt-3 text-sm text-moss">Lesson saved to AI Inbox.</p>}
      {status === 'error' && (
        <p className="mt-3 text-sm text-red-700">Lesson generation failed. Check server env settings.</p>
      )}
    </section>
  );
}
