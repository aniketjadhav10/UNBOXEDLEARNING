// ============================================================
// HierarchicalCard — Generic card for Subjects, Topics, Tasks, Activities
// ============================================================
import { Edit2, MoreVertical, Trash2, Calendar } from 'lucide-react';
import { useState } from 'react';

interface HierarchicalCardProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  progress?: number;
  progressColor?: string;
  footerItems?: { label: string; value: React.ReactNode; icon?: React.ReactNode }[];
  onEdit?: () => void;
  onDelete?: () => void;
  onSchedule?: () => void;
  onClick: () => void;
}

export function HierarchicalCard({
  title,
  subtitle,
  description,
  icon,
  badge,
  progress,
  progressColor = 'from-violet-500 to-purple-600',
  footerItems,
  onEdit,
  onDelete,
  onSchedule,
  onClick,
}: HierarchicalCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div
      className="group relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden cursor-pointer flex flex-col"
      onClick={onClick}
    >
      {/* ── Top Header Section ─────────────────────────────── */}
      <div className="p-4 flex items-start justify-between">
        <div className="flex gap-3 min-w-0">
          {icon && (
            <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 group-hover:bg-violet-50 group-hover:text-violet-600 transition-colors">
              {icon}
            </div>
          )}
          <div className="min-w-0 pt-0.5">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-gray-900 text-sm leading-tight truncate">
                {title}
              </h3>
              {badge}
            </div>
            {subtitle && <p className="text-xs text-violet-500 font-medium mt-0.5">{subtitle}</p>}
          </div>
        </div>

        {/* ── Card Header Actions ─────────────────────────────── */}
        <div className="relative flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {onSchedule && (
            <button
              onClick={onSchedule}
              title="Schedule Task"
              className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-50/70 hover:bg-violet-100 text-violet-600 rounded-lg transition-all"
              aria-label="Schedule Task"
            >
              <Calendar size={12} className="stroke-[2.5]" />
              <span className="text-[10px] font-black uppercase tracking-wider leading-none">Schedule</span>
            </button>
          )}

          {(onEdit || onDelete) && (
            <div className="relative">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="p-1 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors flex items-center justify-center"
              >
                <MoreVertical size={16} />
              </button>

              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 mt-1 w-32 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-20 animate-fade-in">
                    {onEdit && (
                      <button
                        onClick={() => { onEdit(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-gray-600 hover:bg-violet-50 hover:text-violet-700 transition-colors"
                      >
                        <Edit2 size={12} /> Edit
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => { onDelete(); setMenuOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={12} /> Delete
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Description ───────────────────────────────────── */}
      {description && (
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
            {description}
          </p>
        </div>
      )}

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Progress Bar ──────────────────────────────────── */}
      {progress !== undefined && (
        <div className="px-4 pb-3 space-y-1">
          <div className="flex justify-between items-center text-[10px] font-bold">
            <span className="text-gray-400 uppercase tracking-wider">Progress</span>
            <span className="text-violet-600">{progress}%</span>
          </div>
          <div className="h-1 w-full bg-gray-50 rounded-full overflow-hidden">
            <div
              className={`h-full bg-gradient-to-r ${progressColor} transition-all duration-700`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Footer Stats ──────────────────────────────────── */}
      {footerItems && footerItems.length > 0 && (
        <div className="px-4 py-3 bg-gray-50/50 border-t border-gray-50 flex flex-wrap items-center gap-4">
          {footerItems.map((item, idx) => (
            <div key={idx} className="flex items-center gap-1.5 min-w-0">
              {item.icon && <div className="text-gray-300">{item.icon}</div>}
              <div className="min-w-0">
                <span className="text-[10px] text-gray-400 block leading-none uppercase font-bold tracking-tighter">
                  {item.label}
                </span>
                {typeof item.value === 'string' || typeof item.value === 'number' ? (
                  <span className="text-[11px] font-black text-gray-700 truncate block">
                    {item.value}
                  </span>
                ) : (
                  item.value
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Hover Overlay Actions (Optional desktop polish) ── */}
      <div className="absolute inset-0 bg-violet-600/0 group-hover:bg-violet-600/[0.02] pointer-events-none transition-colors duration-300" />
    </div>
  );
}
