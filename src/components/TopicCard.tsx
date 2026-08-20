import { CheckCircle2, Circle, Clock, Brain, Info } from 'lucide-react';
import { useState } from 'react';
import type { DbTopic } from '../types/database';
import { DifficultyBadge } from './ui/Badge';

interface TopicCardProps {
  topic: DbTopic;
  index: number;
  completed?: boolean;
}

export function TopicCard({ topic, index, completed = false }: TopicCardProps) {
  const [showObjectives, setShowObjectives] = useState(false);

  // Derive gradient styling based on difficulty or order
  const getGradientLine = () => {
    if (completed) return 'bg-emerald-400';
    if (topic.difficulty_level === 'Advanced') return 'bg-rose-400';
    if (topic.difficulty_level === 'Intermediate') return 'bg-amber-400';
    return 'bg-violet-400';
  };

  return (
    <div
      id={`topic-card-${topic.id}`}
      className={[
        'group bg-white rounded-2xl shadow-sm hover:shadow-md',
        'border border-gray-100 hover:border-violet-200',
        'p-5 transition-all duration-300 hover:-translate-y-1',
        'animate-fade-in relative overflow-hidden',
      ].join(' ')}
      style={{ animationDelay: `${index * 40}ms` }}
    >
      {/* Left indicator line */}
      <div className={`absolute left-0 top-0 bottom-0 w-1 ${getGradientLine()} opacity-70 group-hover:opacity-100 transition-opacity`} />

      <div className="flex items-start gap-4">
        {/* ── Completion icon ──────────────────────────────── */}
        <div className="flex-shrink-0 mt-1">
          {completed ? (
            <CheckCircle2 size={24} className="text-emerald-500 bg-emerald-50 rounded-full" />
          ) : (
            <Circle size={24} className="text-gray-300 group-hover:text-violet-400 transition-colors" />
          )}
        </div>

        {/* ── Content ──────────────────────────────────────── */}
        <div className="flex-1 min-w-0">
          {/* Title row */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3
              className={[
                'text-base font-bold leading-snug group-hover:text-violet-700 transition-colors flex-1',
                completed ? 'text-gray-500 line-through decoration-gray-300' : 'text-gray-900',
              ].join(' ')}
            >
              {topic.title}
            </h3>
            <DifficultyBadge level={topic.difficulty_level || 'Beginner'} />
          </div>

          {/* Description */}
          <p className="text-gray-500 text-sm leading-relaxed line-clamp-2 mb-3">
            {topic.description}
          </p>

          {/* Meta Information Row */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 font-medium">
            {/* Duration */}
            <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
              <Clock size={12} className="text-blue-500" />
              <span>{topic.estimated_hours ? `${topic.estimated_hours} Hours` : 'N/A'}</span>
            </div>
            
            {/* Bloom's Level */}
            {topic.bloom_level && (
              <div className="flex items-center gap-1.5 bg-gray-50 px-2 py-1 rounded-lg border border-gray-100">
                <Brain size={12} className="text-fuchsia-500" />
                <span>{topic.bloom_level}</span>
              </div>
            )}

            {/* Learning Objectives Info Icon */}
            {topic.learning_objectives && topic.learning_objectives.length > 0 && (
              <div className="relative ml-auto">
                <button 
                  className="flex items-center gap-1 text-violet-500 hover:text-violet-700 transition-colors"
                  onMouseEnter={() => setShowObjectives(true)}
                  onMouseLeave={() => setShowObjectives(false)}
                  onClick={() => setShowObjectives(!showObjectives)}
                >
                  <Info size={14} />
                  <span>Objectives</span>
                </button>

                {/* Popover */}
                {showObjectives && (
                  <div className="absolute bottom-full right-0 mb-2 w-64 bg-gray-900 text-white text-xs rounded-xl shadow-xl p-3 z-20 animate-fade-in">
                    <p className="font-bold text-violet-300 mb-2 uppercase tracking-wider text-[10px]">Learning Objectives</p>
                    <ul className="list-disc pl-4 space-y-1 text-gray-200">
                      {topic.learning_objectives.map((obj, i) => (
                        <li key={i}>{obj}</li>
                      ))}
                    </ul>
                    <div className="absolute -bottom-1.5 right-4 w-3 h-3 bg-gray-900 rotate-45" />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Keywords */}
          {topic.keywords && topic.keywords.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-gray-50">
              {topic.keywords.slice(0, 4).map((kw, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full border border-gray-200">
                  {kw}
                </span>
              ))}
              {topic.keywords.length > 4 && (
                <span className="text-[10px] px-2 py-0.5 text-gray-400">
                  +{topic.keywords.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
