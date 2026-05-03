import { useAppStore } from '../store/useAppStore';

export function InboxPage() {
  const aiInbox = useAppStore((state) => state.aiInbox);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-ink">AI Content Inbox</h1>
        <p className="mt-1 text-ink/65">Generated lessons appear here before being saved into curriculum.</p>
      </div>

      {aiInbox.length === 0 ? (
        <div className="rounded-md border border-dashed border-black/20 bg-white p-8 text-center text-ink/60">
          Generate a lesson from the dashboard to populate the inbox.
        </div>
      ) : (
        <div className="space-y-3">
          {aiInbox.map((item) => (
            <article key={item.id} className="rounded-md border border-black/10 bg-white p-5">
              <p className="text-sm font-medium text-clay">{item.topic}</p>
              <h2 className="mt-1 text-xl font-semibold text-ink">{item.lesson.title}</h2>
              <p className="mt-2 text-ink/70">{item.lesson.summary}</p>
              <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink/70">
                {item.lesson.objectives.map((objective) => (
                  <li key={objective}>{objective}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
