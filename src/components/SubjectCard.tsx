import { ArrowRight, BookOpen, Clock, Tag, LayoutGrid } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { DbSubject } from '../types/database';
import { ProgressBar } from './ui/ProgressBar';

interface SubjectCardProps {
  subject: DbSubject;
  progressPercent?: number; // Optional progress passed from parent
  topicsCount?: number;     // Optional count passed from parent
}

// Helper to determine gradient based on subject type or progress
function getGradientClasses(type: string, percent: number) {
  if (percent >= 100) return 'from-emerald-400 to-teal-500';
  if (type === 'core') return 'from-indigo-500 to-purple-600';
  if (type === 'elective') return 'from-amber-400 to-orange-500';
  if (type === 'enrichment') return 'from-pink-400 to-rose-500';
  return 'from-violet-500 to-fuchsia-600'; // fallback
}

export function SubjectCard({ subject, progressPercent = 0, topicsCount = 0 }: SubjectCardProps) {
  const router = useRouter();
  
  // Clean up grade levels string
  const gradeLevelsStr = subject.grade_levels?.length 
    ? (subject.grade_levels.length > 2 ? 'Multiple Grades' : subject.grade_levels.join(', '))
    : 'All Grades';
    
  const gradientClass = getGradientClasses(subject.subject_type || '', progressPercent);

  return (
    <div
      id={`subject-card-${subject.id}`}
      onClick={() => router.push(`/subjects/${subject.id}/topics`)}
      className={[
        'group relative bg-white rounded-3xl shadow-card hover:shadow-card-hover',
        'cursor-pointer transition-all duration-300 hover:-translate-y-1',
        'overflow-hidden border border-gray-100',
        'flex flex-col h-full'
      ].join(' ')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && router.push(`/subjects/${subject.id}/topics`)}
    >
      {/* ── Gradient header strip ──────────────────────────── */}
      <div className={`h-28 bg-gradient-to-br ${gradientClass} relative overflow-hidden flex-shrink-0 transition-all duration-500 group-hover:scale-[1.02]`}>
        {/* Decorative circles */}
        <div className="absolute -top-6 -right-6 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
        <div className="absolute -bottom-8 -left-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
        
        {/* Type Badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1 bg-white/20 backdrop-blur-md rounded-lg flex items-center gap-1.5 text-white shadow-sm border border-white/10">
          <LayoutGrid size={12} className="opacity-80" />
          <span className="text-[10px] font-bold uppercase tracking-wider">
            {subject.subject_type || 'Custom'}
          </span>
        </div>

        {/* Arrow — appears on hover */}
        <div className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
          <ArrowRight size={16} className="text-white drop-shadow-md" />
        </div>
      </div>

      {/* ── Card body ─────────────────────────────────────── */}
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-gray-900 text-lg mb-1 leading-tight group-hover:text-violet-700 transition-colors">
          {subject.name}
        </h3>
        <p className="text-gray-500 text-xs line-clamp-2 leading-relaxed mb-4 flex-grow">
          {subject.description || 'No description provided.'}
        </p>

        {/* ── Meta Details ──────────────────────────────── */}
        <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
          <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
            <BookOpen size={12} className="text-violet-500" />
            <span className="font-medium">{topicsCount} Topics</span>
          </div>
          {subject.estimated_weeks && (
            <div className="flex items-center gap-1.5 text-gray-500 bg-gray-50 px-2 py-1.5 rounded-lg border border-gray-100">
              <Clock size={12} className="text-blue-500" />
              <span className="font-medium">{subject.estimated_weeks} Weeks</span>
            </div>
          )}
        </div>

        {/* ── Tags (First 2) ────────────────────────────── */}
        {subject.tags && subject.tags.length > 0 && (
          <div className="flex items-center gap-1.5 mb-4 flex-wrap">
            <Tag size={12} className="text-gray-400" />
            {subject.tags.slice(0, 2).map((tag, i) => (
              <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-violet-50 text-violet-700 rounded-full border border-violet-100">
                {tag}
              </span>
            ))}
            {subject.tags.length > 2 && (
              <span className="text-[10px] font-medium px-2 py-0.5 bg-gray-50 text-gray-500 rounded-full border border-gray-100">
                +{subject.tags.length - 2}
              </span>
            )}
          </div>
        )}

        {/* ── Progress ──────────────────────────────────── */}
        <div className="mt-auto pt-2 border-t border-gray-50">
          <div className="flex justify-between items-center mb-1">
            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{gradeLevelsStr}</span>
            <span className="text-xs font-bold text-gray-700">{progressPercent}%</span>
          </div>
          <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
            <div 
              className={`h-full bg-gradient-to-r ${gradientClass} transition-all duration-1000 ease-out`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
