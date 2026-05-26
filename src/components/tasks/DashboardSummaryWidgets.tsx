// ============================================================
// DashboardSummary — Top widget strip with key metrics
// ============================================================
import { AlertTriangle, Calendar, Flame, Star, TrendingUp, Zap } from 'lucide-react';
import type { DashboardSummary as DS } from '../../types/taskTypes';

interface DashboardSummaryProps {
  summary: DS;
}

export function DashboardSummaryWidgets({ summary }: DashboardSummaryProps) {
  const widgets = [
    {
      label: 'Due Today',
      value: summary.dueTodayCount,
      icon: Calendar,
      color: 'from-blue-500 to-cyan-500',
      bg: 'bg-blue-50',
      text: 'text-blue-700',
    },
    {
      label: 'Overdue',
      value: summary.overdueCount,
      icon: AlertTriangle,
      color: 'from-red-500 to-orange-500',
      bg: 'bg-red-50',
      text: 'text-red-700',
      urgent: summary.overdueCount > 0,
    },
    {
      label: 'Mastered',
      value: summary.masteredCount,
      icon: Star,
      color: 'from-emerald-500 to-teal-500',
      bg: 'bg-emerald-50',
      text: 'text-emerald-700',
    },
    {
      label: 'This Week',
      value: summary.scheduledThisWeekCount,
      icon: Zap,
      color: 'from-violet-500 to-purple-500',
      bg: 'bg-violet-50',
      text: 'text-violet-700',
    },
    {
      label: 'Avg Interest',
      value: `${summary.avgInterestLevel} ★`,
      icon: Flame,
      color: 'from-amber-500 to-yellow-500',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
    },
    {
      label: 'Consistency',
      value: `${summary.consistencyScore}%`,
      icon: TrendingUp,
      color: 'from-pink-500 to-rose-500',
      bg: 'bg-pink-50',
      text: 'text-pink-700',
    },
  ];

  return (
    <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
      {widgets.map(({ label, value, icon: Icon, bg, text, urgent }) => (
        <div
          key={label}
          className={[
            'rounded-2xl p-3 text-center relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5',
            bg,
            urgent ? 'ring-2 ring-red-300 ring-offset-1' : '',
          ].join(' ')}
        >
          <div className="flex justify-center mb-1.5">
            <Icon size={16} className={text} />
          </div>
          <p className={`text-xl font-black leading-none ${text}`}>{value}</p>
          <p className={`text-[10px] font-semibold mt-1 opacity-70 ${text}`}>{label}</p>
          {urgent && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse-slow" />
          )}
        </div>
      ))}
    </div>
  );
}
