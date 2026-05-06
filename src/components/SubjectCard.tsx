// ============================================================
// SubjectCard — Clickable card for subject listing page
// ============================================================
import { ArrowRight, BookOpen } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type Subject } from '../data/mockData';
import { ProgressBar } from './ui/ProgressBar';

interface SubjectCardProps {
  subject: Subject;
}

export function SubjectCard({ subject }: SubjectCardProps) {
  const navigate = useNavigate();

  return (
    <div
      id={`subject-card-${subject.id}`}
      onClick={() => navigate(`/subjects/${subject.id}/topics`)}
      className={[
        'group relative bg-white rounded-2xl shadow-card hover:shadow-card-hover',
        'cursor-pointer transition-all duration-300 hover:-translate-y-1',
        'overflow-hidden border border-gray-100/80',
      ].join(' ')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/subjects/${subject.id}/topics`)}
      aria-label={`View topics for ${subject.name}`}
    >
      {/* ── Gradient header strip ──────────────────────────── */}
      <div className={`h-24 bg-gradient-to-br ${subject.gradient} relative overflow-hidden`}>
        {/* Decorative circles */}
        <div className="absolute -top-4 -right-4 w-20 h-20 bg-white/10 rounded-full" />
        <div className="absolute -bottom-6 -left-2 w-16 h-16 bg-white/10 rounded-full" />
        {/* Emoji */}
        <span className="absolute bottom-3 left-4 text-3xl select-none" role="img" aria-hidden>
          {subject.emoji}
        </span>
        {/* Arrow — appears on hover */}
        <div className="absolute top-3 right-3 w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <ArrowRight size={14} className="text-white" />
        </div>
      </div>

      {/* ── Card body ─────────────────────────────────────── */}
      <div className="p-4">
        <h3 className="font-bold text-gray-900 text-sm mb-1 leading-tight group-hover:text-violet-700 transition-colors">
          {subject.name}
        </h3>
        <p className="text-gray-400 text-xs line-clamp-2 leading-relaxed mb-3">
          {subject.description}
        </p>

        {/* ── Topics count ──────────────────────────────── */}
        <div className="flex items-center gap-1.5 mb-3">
          <BookOpen size={12} className="text-violet-400" />
          <span className="text-xs text-gray-500">
            <span className="font-semibold text-gray-700">{subject.topicsCount}</span> Topics
          </span>
        </div>

        {/* ── Progress ──────────────────────────────────── */}
        <ProgressBar
          value={subject.progress}
          size="sm"
          color={subject.gradient}
          showLabel
        />
      </div>
    </div>
  );
}
