// ============================================================
// TopicCard — Card for individual topics within a subject
// ============================================================
import { CheckCircle2, Circle, Clock } from 'lucide-react';
import { type Topic } from '../data/mockData';
import { DifficultyBadge } from './ui/Badge';

interface TopicCardProps {
  topic: Topic;
  index: number;
}

export function TopicCard({ topic, index }: TopicCardProps) {
  return (
    <div
      id={`topic-card-${topic.id}`}
      className={[
        'group bg-white rounded-xl shadow-card hover:shadow-card-hover',
        'border border-gray-100/80 hover:border-violet-200',
        'p-4 transition-all duration-200 hover:-translate-y-0.5',
        'animate-fade-in',
      ].join(' ')}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* ── Completion icon ──────────────────────────────── */}
        <div className="flex-shrink-0 mt-0.5">
          {topic.completed ? (
            <CheckCircle2 size={20} className="text-emerald-500" />
          ) : (
            <Circle size={20} className="text-gray-300 group-hover:text-violet-300 transition-colors" />
          )}
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <h3
              className={[
                'text-sm font-semibold leading-snug group-hover:text-violet-700 transition-colors',
                topic.completed ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-900',
              ].join(' ')}
            >
              {topic.title}
            </h3>
            <DifficultyBadge level={topic.difficulty} />
          </div>

          {/* Description */}
          <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-2">
            {topic.description}
          </p>

          {/* Duration */}
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Clock size={11} />
            <span>{topic.duration}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
