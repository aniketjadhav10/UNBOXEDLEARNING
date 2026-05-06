// Profile Page — real auth user + Supabase data
import { Edit3, Mail, Star, Trophy } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { Badge } from '../../components/ui/Badge';
import { ProgressBar } from '../../components/ui/ProgressBar';

export function ProfilePage() {
  const { user } = useAuth();
  const { subjects, topics } = useData();

  const completed  = topics.filter((t) => t.completed).length;
  const favSubjects = [...subjects].sort((a, b) => b.progress - a.progress).slice(0, 3);
  const achievements = Math.floor(completed / 3);

  return (
    <div className="space-y-6 animate-fade-in max-w-2xl">
      <div>
        <h2 className="text-xl font-bold text-gray-900">My Profile</h2>
        <p className="text-sm text-gray-400 mt-0.5">Your learning identity</p>
      </div>

      {/* Profile card */}
      <div className="bg-white rounded-3xl shadow-card border border-gray-100/80 overflow-hidden">
        <div className={`h-24 bg-gradient-to-br ${user.avatarColor}`} />
        <div className="px-6 pb-6">
          <div className="flex items-end justify-between -mt-8 mb-4">
            <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${user.avatarColor} flex items-center justify-center text-white text-xl font-bold shadow-lg ring-4 ring-white`}>
              {user.avatarInitials}
            </div>
            <button className="flex items-center gap-2 px-4 py-2 bg-violet-50 text-violet-700 text-sm font-semibold rounded-xl hover:bg-violet-100 transition-colors">
              <Edit3 size={14} /> Edit
            </button>
          </div>
          <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
          <div className="flex items-center gap-1.5 mt-1 text-sm text-gray-400">
            <Mail size={13} />
            <span>{user.email}</span>
          </div>
          <div className="mt-3">
            <Badge label={user.role === 'admin' ? 'Parent / Admin' : 'Student'} variant="violet" size="md" />
          </div>
        </div>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: '📚', label: 'Subjects',     value: subjects.length },
          { icon: '✅', label: 'Completed',    value: completed       },
          { icon: '🏆', label: 'Achievements', value: achievements    },
        ].map(({ icon, label, value }) => (
          <div key={label} className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-4 text-center">
            <p className="text-2xl mb-1">{icon}</p>
            <p className="text-xl font-bold text-gray-900">{value}</p>
            <p className="text-xs text-gray-400">{label}</p>
          </div>
        ))}
      </div>

      {/* Favourite subjects */}
      {favSubjects.length > 0 && (
        <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
          <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
            <Star size={15} className="text-amber-400" /> Favourite Subjects
          </h3>
          <div className="space-y-2">
            {favSubjects.map((s) => (
              <div key={s.id} className="flex items-center gap-3">
                <span className="text-lg">{s.emoji}</span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-700">{s.name}</p>
                  <ProgressBar value={s.progress} size="sm" color={s.gradient} className="mt-1" />
                </div>
                <span className="text-xs font-bold text-violet-600">{s.progress}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Achievements */}
      <div className="bg-white rounded-2xl shadow-card border border-gray-100/80 p-5">
        <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
          <Trophy size={15} className="text-amber-400" /> Achievements
        </h3>
        {achievements === 0 ? (
          <p className="text-xs text-gray-400 text-center py-4">Complete topics to earn achievements!</p>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            {[
              { emoji: '🌟', title: 'First Topic'    },
              { emoji: '🔥', title: '7-Day Streak'   },
              { emoji: '🎨', title: 'Art Explorer'   },
              { emoji: '📚', title: 'Bookworm'       },
            ].slice(0, achievements).map(({ emoji, title }) => (
              <div key={title} className="flex items-center gap-2 bg-violet-50 rounded-xl p-3">
                <span className="text-xl">{emoji}</span>
                <p className="text-xs font-semibold text-violet-800">{title}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
