export function EmptyState({ message = 'No records found' }: { message?: string }) {
  return (
    <div className="rounded-md border border-dashed border-black/20 bg-white p-8 text-center text-ink/60">
      {message}
    </div>
  );
}
