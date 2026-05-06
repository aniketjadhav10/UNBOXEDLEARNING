import { Activity, BookOpen, Bot, ClipboardList, Layers, ShieldCheck, UsersRound, UserRound } from 'lucide-react';
import { NavLink, Navigate, Outlet } from 'react-router-dom';
import { Loader } from '../../components/ui/Loader';
import { useAdminAuth } from '../../hooks/useAdminAuth';

const navItems = [
  { href: '/admin/family', label: 'Family', icon: UsersRound },
  { href: '/admin/children', label: 'Children', icon: UserRound },
  { href: '/admin/subjects', label: 'Subjects', icon: BookOpen },
  { href: '/admin/topics', label: 'Topics', icon: Layers },
  { href: '/admin/tasks', label: 'Tasks', icon: ClipboardList },
  { href: '/admin/activities', label: 'Activities', icon: Activity },
  { href: '/admin/ai-inbox', label: 'AI Inbox', icon: Bot },
];

export function AdminLayout() {
  const { isAdmin, loading } = useAdminAuth();

  if (loading) {
    return (
      <main className="min-h-screen bg-[#f7f4ef] p-4">
        <Loader />
      </main>
    );
  }

  if (!isAdmin) return <Navigate to="/login" replace />;

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-ink text-white">
            <ShieldCheck size={21} />
          </div>
          <div>
            <p className="text-lg font-semibold text-ink">Admin Panel</p>
            <p className="text-sm text-ink/60">Manage curriculum content and AI generated lessons.</p>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-5 px-4 py-5 md:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 overflow-x-auto pb-1 md:flex-col md:overflow-visible md:pb-0">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                [
                  'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                  isActive ? 'bg-ink text-white' : 'text-ink/70 hover:bg-white',
                ].join(' ')
              }
            >
              <item.icon aria-hidden="true" size={18} />
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
