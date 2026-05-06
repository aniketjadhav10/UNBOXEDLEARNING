import { Pencil, Trash2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { Button } from '../ui/Button';

export function Card({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <article
      className="cursor-pointer rounded-xl bg-white p-4 shadow-md transition hover:-translate-y-0.5 hover:shadow-lg"
      onClick={onClick}
    >
      {children}
    </article>
  );
}

export function CardHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h3 className="text-base font-semibold text-ink">{title}</h3>
      {subtitle && <p className="mt-1 line-clamp-2 text-sm text-ink/65">{subtitle}</p>}
    </div>
  );
}

export function CardActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="mt-4 flex gap-2 border-t border-black/10 pt-3">
      <Button
        className="flex-1"
        icon={<Pencil size={16} />}
        onClick={(event) => {
          event.stopPropagation();
          onEdit();
        }}
        type="button"
        variant="secondary"
      >
        Edit
      </Button>
      <Button
        className="flex-1"
        icon={<Trash2 size={16} />}
        onClick={(event) => {
          event.stopPropagation();
          onDelete();
        }}
        type="button"
        variant="danger"
      >
        Delete
      </Button>
    </div>
  );
}
