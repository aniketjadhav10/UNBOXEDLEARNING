import {
  Archive,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  GraduationCap,
  Heart,
  Home,
  ListChecks,
  LogOut,
  Mail,
  Settings,
  Star,
  TrendingUp,
  Users,
  X,
  Zap,
} from 'lucide-react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useMemo } from 'react';
import { motion } from 'framer-motion';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'Subjects', path: '/subjects', icon: BookOpen },
  { label: 'Topics', path: '/topics', icon: ListChecks },
  { label: 'Tasks', path: '/tasks', icon: BrainCircuit },
  { label: 'Activities', path: '/activities', icon: Zap },
  { label: 'This Week', path: '/this-week', icon: CalendarCheck },
  { label: 'Scheduled', path: '/scheduled', icon: CalendarClock },
  { label: 'Reports', path: '/reports', icon: BarChart3 },
  { label: 'Archived', path: '/archived', icon: Archive },
  { label: 'Family', path: '/family', icon: Heart },
  { label: 'Kids', path: '/kids', icon: Users },
  { label: 'System Logs', path: '/system/emails', icon: Mail },
  { label: 'Settings', path: '/settings', icon: Settings },
];

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'My Learning', path: '/my-learning', icon: GraduationCap },
  { label: 'Subjects', path: '/subjects', icon: BookOpen },
  { label: 'Progress', path: '/progress', icon: TrendingUp },
  { label: 'Profile', path: '/profile', icon: Star },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isAdmin, signOut } = useAuth();
  const { kids } = useData();
  const navigate = useNavigate();

  const navItems = useMemo(() => {
    let items = isAdmin ? ADMIN_NAV : STUDENT_NAV;
    if (isAdmin && kids.length <= 1) {
      items = items.filter((item) => item.label !== 'Kids');
    }
    return items;
  }, [isAdmin, kids.length]);

  async function handleSignOut() {
    await signOut();
    navigate('/login', { replace: true });
  }

  return (
    <>
      {/* ── Mobile overlay ───────────────────────────────────── */}
      {isOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* ── Sidebar panel ────────────────────────────────────── */}
      <aside
        id="main-sidebar"
        className={[
          'fixed top-0 left-0 z-40 h-full w-64 flex flex-col',
          'bg-gradient-to-b from-[#1e1b4b] to-[#312e81]',
          'shadow-sidebar transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* ── Logo ─────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-400 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
              <GraduationCap size={18} className="text-white" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-tight">UnBoxed</p>
              <p className="text-violet-300 text-xs">Learning</p>
            </div>
          </div>
          {/* Close button — mobile only */}
          <button
            onClick={onClose}
            className="lg:hidden text-white/60 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>


        {/* ── Nav label ────────────────────────────────────── */}
        <p className="px-5 mt-5 mb-2 text-[10px] uppercase tracking-widest text-violet-400 font-semibold">
          {isAdmin ? 'Management' : 'Learning'}
        </p>

        {/* ── Nav items ────────────────────────────────────── */}
        <nav className="flex-1 overflow-y-auto px-3 space-y-0.5 hide-scrollbar">
          {navItems.map((item, index) => (
            <motion.div
              key={item.path}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 24,
                delay: 0.05 * index,
              }}
            >
            <NavLink
              to={item.path}
              end={item.path === '/'}
              onClick={onClose}
              className={({ isActive }) =>
                [
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-gradient-to-r from-violet-500/25 to-indigo-500/10 text-white border border-violet-400/30 shadow-sm'
                    : 'text-violet-200 hover:bg-white/10 hover:text-white border border-transparent',
                ].join(' ')
              }
            >
              {({ isActive }) => (
                <>
                  {/* Active indicator bar */}
                  <span
                    className={[
                      'w-0.5 h-4 rounded-full transition-all duration-200 flex-shrink-0',
                      isActive ? 'bg-gradient-to-b from-violet-300 to-indigo-300 shadow-glow' : 'bg-transparent',
                    ].join(' ')}
                  />
                  <item.icon size={17} />
                  {item.label}
                  {isActive && (
                    <ChevronLeft size={14} className="ml-auto rotate-180 text-violet-300" />
                  )}
                </>
              )}
            </NavLink>
            </motion.div>
          ))}
        </nav>

        {/* ── Logout ───────────────────────────────────────── */}
        <div className="p-3 border-t border-white/10 mb-2">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-violet-200 hover:bg-red-500/15 hover:text-red-300 transition-all duration-200"
          >
            <span className="w-0.5 h-4 rounded-full bg-transparent flex-shrink-0" />
            <LogOut size={17} />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
}
