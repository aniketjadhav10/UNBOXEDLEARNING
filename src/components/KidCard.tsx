// ============================================================
// KidCard — Card for kids listing page
// ============================================================
import { ChevronRight, Star, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { type Kid } from '../data/mockData';
import { ProgressBar } from './ui/ProgressBar';

interface KidCardProps {
  kid: Kid;
}

export function KidCard({ kid }: KidCardProps) {
  const navigate = useNavigate();

  return (
    <div
      id={`kid-card-${kid.id}`}
      onClick={() => navigate(`/kids/${kid.id}`)}
      className={[
        'group bg-white rounded-2xl shadow-card hover:shadow-card-hover',
        'cursor-pointer transition-all duration-300 hover:-translate-y-1',
        'border border-gray-100/80 hover:border-violet-200 p-5',
      ].join(' ')}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/kids/${kid.id}`)}
      aria-label={`View profile of ${kid.name}`}
    >
      {/* ── Header: avatar + name ─────────────────────────── */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          {/* Avatar */}
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${kid.avatarColor} flex items-center justify-center text-white font-bold text-sm shadow-md`}>
            {kid.avatarInitials}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 text-sm group-hover:text-violet-700 transition-colors">
              {kid.name}
            </h3>
            <p className="text-xs text-gray-400">{kid.grade} · Age {kid.age}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-gray-300 group-hover:text-violet-400 transition-colors mt-1" />
      </div>

      {/* ── Stats row ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-2 mb-4">
        <div className="bg-violet-50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-violet-400 font-medium">Subjects</p>
          <p className="text-lg font-bold text-violet-700">{kid.progress.subjectsEnrolled}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-2.5 text-center">
          <p className="text-xs text-emerald-500 font-medium">Activities</p>
          <p className="text-lg font-bold text-emerald-700">{kid.progress.activitiesCompleted}</p>
        </div>
      </div>

      {/* ── Overall progress ──────────────────────────────── */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <div className="flex items-center gap-1 text-gray-500">
            <TrendingUp size={11} />
            <span>Overall Progress</span>
          </div>
          <span className="font-semibold text-violet-600">{kid.progress.overall}%</span>
        </div>
        <ProgressBar value={kid.progress.overall} size="sm" />
      </div>

      {/* ── Learning style tag ────────────────────────────── */}
      <div className="flex items-center gap-1.5">
        <Star size={11} className="text-amber-400" />
        <span className="text-xs text-gray-500">{kid.learningStyle} Learner</span>
      </div>
    </div>
  );
}
