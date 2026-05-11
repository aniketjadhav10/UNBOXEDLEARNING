// ============================================================
// TaskFilters — Advanced filter panel + sort + search
// ============================================================
import { Filter, Search, SortAsc, X } from 'lucide-react';
import { useState } from 'react';
import type { InterestLevel, LearningStage, TaskFilter, TaskSortKey } from '../../types/taskTypes';
import { LEARNING_STAGES } from './LearningStageBadge';

interface TaskFiltersProps {
  filter: TaskFilter;
  onFilterChange: (f: TaskFilter) => void;
  sortKey: TaskSortKey;
  onSortChange: (s: TaskSortKey) => void;
  search: string;
  onSearchChange: (s: string) => void;
  subjectOptions: { id: string; name: string }[];
}

const SORT_OPTIONS: { key: TaskSortKey; label: string }[] = [
  { key: 'next_due_at',        label: 'Next Due'          },
  { key: 'progress',           label: 'Progress %'        },
  { key: 'last_practiced_at',  label: 'Recently Practiced'},
  { key: 'interest_level',     label: 'Interest Level'    },
];

const INTEREST_OPTIONS: { level: InterestLevel; emoji: string; label: string }[] = [
  { level: 1, emoji: '😴', label: 'Very Low' },
  { level: 2, emoji: '😐', label: 'Low'       },
  { level: 3, emoji: '🙂', label: 'Moderate'  },
  { level: 4, emoji: '😊', label: 'High'      },
  { level: 5, emoji: '🤩', label: 'Very High' },
];

export function TaskFilters({
  filter,
  onFilterChange,
  sortKey,
  onSortChange,
  search,
  onSearchChange,
  subjectOptions,
}: TaskFiltersProps) {
  const [panelOpen, setPanelOpen] = useState(false);

  const activeCount = [
    filter.subject,
    filter.stage,
    filter.dueToday,
    filter.overdue,
    filter.scheduledThisWeek,
    filter.interestLevel,
  ].filter(Boolean).length;

  function clearAll() {
    onFilterChange({
      subject: '', stage: '', dueToday: false,
      overdue: false, scheduledThisWeek: false, interestLevel: 0,
    });
  }

  return (
    <div className="space-y-3">
      {/* Search + controls row */}
      <div className="flex gap-2">
        {/* Search */}
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            id="task-search"
            type="text"
            placeholder="Search tasks…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 transition-all"
          />
          {search && (
            <button
              onClick={() => onSearchChange('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Sort dropdown */}
        <select
          value={sortKey}
          onChange={(e) => onSortChange(e.target.value as TaskSortKey)}
          className="px-3 py-2.5 text-sm bg-white border border-gray-200 rounded-xl outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100 cursor-pointer"
          aria-label="Sort by"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>{o.label}</option>
          ))}
        </select>

        {/* Filter toggle */}
        <button
          id="task-filter-btn"
          onClick={() => setPanelOpen((v) => !v)}
          className={[
            'relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-semibold rounded-xl border transition-all',
            panelOpen || activeCount > 0
              ? 'bg-violet-600 text-white border-violet-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-violet-300',
          ].join(' ')}
        >
          <Filter size={14} />
          <span className="hidden sm:inline">Filter</span>
          {activeCount > 0 && (
            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center">
              {activeCount}
            </span>
          )}
        </button>
      </div>

      {/* Expandable filter panel */}
      {panelOpen && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 space-y-4 animate-fade-in shadow-card">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-gray-700 uppercase tracking-widest flex items-center gap-1.5">
              <SortAsc size={13} className="text-violet-500" /> Advanced Filters
            </p>
            {activeCount > 0 && (
              <button
                onClick={clearAll}
                className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center gap-1"
              >
                <X size={11} /> Clear all
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Subject */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Subject</label>
              <select
                value={filter.subject}
                onChange={(e) => onFilterChange({ ...filter, subject: e.target.value })}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400"
              >
                <option value="">All Subjects</option>
                {subjectOptions.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Stage */}
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1.5">Learning Stage</label>
              <select
                value={filter.stage}
                onChange={(e) => onFilterChange({ ...filter, stage: e.target.value as LearningStage | '' })}
                className="w-full px-3 py-2 text-sm bg-gray-50 border border-gray-200 rounded-xl outline-none focus:border-violet-400"
              >
                <option value="">All Stages</option>
                {LEARNING_STAGES.map((s) => (
                  <option key={s} value={s}>{s.replace('_', ' ')}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Toggle filters */}
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'dueToday',          label: '📅 Due Today'      },
              { key: 'overdue',            label: '⚠ Overdue'         },
              { key: 'scheduledThisWeek',  label: '🗓 This Week'       },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => onFilterChange({ ...filter, [key]: !filter[key as keyof TaskFilter] })}
                className={[
                  'px-3 py-1.5 text-xs font-semibold rounded-full border transition-all',
                  filter[key as keyof TaskFilter]
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-500 border-gray-200 hover:border-violet-300',
                ].join(' ')}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Interest level filter */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-2">Interest Level</label>
            <div className="flex gap-2">
              <button
                onClick={() => onFilterChange({ ...filter, interestLevel: 0 })}
                className={[
                  'px-3 py-1.5 text-xs font-semibold rounded-full border transition-all',
                  !filter.interestLevel
                    ? 'bg-violet-600 text-white border-violet-600'
                    : 'bg-white text-gray-500 border-gray-200',
                ].join(' ')}
              >
                All
              </button>
              {INTEREST_OPTIONS.map(({ level, emoji, label }) => (
                <button
                  key={level}
                  title={label}
                  onClick={() => onFilterChange({ ...filter, interestLevel: level })}
                  className={[
                    'px-2.5 py-1.5 text-sm rounded-full border transition-all',
                    filter.interestLevel === level
                      ? 'bg-violet-600 border-violet-600 scale-110'
                      : 'bg-white border-gray-200 hover:border-violet-300',
                  ].join(' ')}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
