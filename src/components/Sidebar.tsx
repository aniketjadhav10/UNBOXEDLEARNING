import {
  Archive,
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  CalendarClock,
  ChevronLeft,
  ChevronDown,
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
  Sparkles,
  LibraryBig,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItem {
  label: string;
  path?: string;
  icon: React.ElementType;
  subItems?: { label: string; path: string; icon: React.ElementType }[];
}

const ADMIN_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home },
  {
    label: 'Curriculum',
    icon: BookOpen,
    subItems: [
      { label: '360° Development', path: '/development', icon: Sparkles },
      { label: 'Subjects', path: '/subjects', icon: BookOpen },
      { label: 'Library', path: '/library', icon: LibraryBig },
      { label: 'Topics', path: '/topics', icon: ListChecks },
      { label: 'Tasks', path: '/tasks', icon: BrainCircuit },
      { label: 'Activities', path: '/activities', icon: Zap },
    ]
  },
  {
    label: 'Planning',
    icon: CalendarCheck,
    subItems: [
      { label: 'This Week', path: '/this-week', icon: CalendarCheck },
      { label: 'Planner', path: '/planner', icon: CalendarClock },
      { label: 'Scheduled', path: '/scheduled', icon: CalendarClock },
      { label: 'Reports', path: '/reports', icon: BarChart3 },
      { label: 'Archived', path: '/archived', icon: Archive },
    ]
  },
  {
    label: 'Administration',
    icon: Settings,
    subItems: [
      { label: 'Family', path: '/family', icon: Heart },
      { label: 'Kids', path: '/kids', icon: Users },
      { label: 'Global Templates', path: '/admin/templates', icon: LibraryBig },
      { label: 'AI Syllabus', path: '/syllabus-generator', icon: Sparkles },
      { label: 'System Logs', path: '/system/emails', icon: Mail },
      { label: 'AI Usage', path: '/system/ai-usage', icon: BrainCircuit },
      { label: 'Settings', path: '/settings', icon: Settings },
    ]
  }
];

const STUDENT_NAV: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: Home },
  { label: 'My Learning', path: '/my-learning', icon: GraduationCap },
  { label: 'Subjects', path: '/subjects', icon: BookOpen },
  { label: 'Progress', path: '/progress', icon: TrendingUp },
  { label: 'Profile', path: '/profile', icon: Star },
];

function NavGroup({ item, currentPath, onClose }: { item: NavItem; currentPath: string; onClose: () => void }) {
  const hasActiveChild = item.subItems?.some(
    (sub) => currentPath === sub.path || (sub.path !== '/' && currentPath.startsWith(sub.path))
  );
  
  const [isOpen, setIsOpen] = useState(hasActiveChild || false);

  useEffect(() => {
    if (hasActiveChild) setIsOpen(true);
  }, [hasActiveChild]);

  return (
    <div className="mb-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium text-violet-200 hover:bg-white/10 hover:text-white transition-all duration-200 group"
      >
        <div className="flex items-center gap-3">
          <item.icon size={17} className={isOpen ? "text-violet-300" : "group-hover:text-violet-300"} />
          {item.label}
        </div>
        <ChevronDown size={14} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-violet-300' : 'text-violet-400/50 group-hover:text-violet-300'}`} />
      </button>

      <AnimatePresence>
        {isOpen && item.subItems && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="mt-1 pl-4 pr-1 space-y-0.5">
              {item.subItems.map((sub) => {
                const isSubActive = sub.path === '/' ? currentPath === '/' : currentPath.startsWith(sub.path);
                return (
                  <Link
                    key={sub.path}
                    href={sub.path}
                    onClick={onClose}
                    className={[
                      'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200',
                      isSubActive
                        ? 'bg-gradient-to-r from-violet-500/25 to-indigo-500/10 text-white border border-violet-400/30 shadow-sm'
                        : 'text-violet-200/80 hover:bg-white/10 hover:text-white border border-transparent',
                    ].join(' ')}
                  >
                    <span
                      className={[
                        'w-0.5 h-3.5 rounded-full transition-all duration-200 flex-shrink-0',
                        isSubActive ? 'bg-gradient-to-b from-violet-300 to-indigo-300 shadow-glow' : 'bg-transparent',
                      ].join(' ')}
                    />
                    <sub.icon size={15} />
                    {sub.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const { isAdmin, isSuperAdmin, signOut } = useAuth();
  const { kids } = useData();
  const router = useRouter();
  const pathname = usePathname();

  const navItems = useMemo(() => {
    let items = isAdmin ? [...ADMIN_NAV] : [...STUDENT_NAV];
    
    // Deep clone to safely mutate
    items = items.map(item => ({ 
      ...item, 
      subItems: item.subItems ? [...item.subItems] : undefined 
    }));

    if (isAdmin && kids.length <= 1) {
      items = items.map(group => {
        if (group.subItems) {
          return {
            ...group,
            subItems: group.subItems.filter(item => item.label !== 'Kids')
          };
        }
        return group.label !== 'Kids' ? group : null;
      }).filter(Boolean) as NavItem[];
    }

    if (isSuperAdmin) {
      const adminGroup = items.find(g => g.label === 'Administration');
      if (adminGroup && adminGroup.subItems) {
        // Insert User Approvals right after Kids
        const kidsIndex = adminGroup.subItems.findIndex(i => i.label === 'Kids');
        adminGroup.subItems.splice(kidsIndex + 1, 0, { 
          label: 'User Approvals', 
          path: '/admin/approvals', 
          icon: ShieldCheck 
        });
      }
    }
    
    return items;
  }, [isAdmin, isSuperAdmin, kids.length]);

  async function handleSignOut() {
    await signOut();
    router.replace('/login');
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
              key={item.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                type: 'spring',
                stiffness: 300,
                damping: 24,
                delay: 0.05 * index,
              }}
            >
              {item.subItems ? (
                <NavGroup item={item} currentPath={pathname} onClose={onClose} />
              ) : (
                (() => {
                  const isItemActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path!);
                  return (
                    <Link
                      href={item.path!}
                      onClick={onClose}
                      className={[
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 mb-1',
                        isItemActive
                          ? 'bg-gradient-to-r from-violet-500/25 to-indigo-500/10 text-white border border-violet-400/30 shadow-sm'
                          : 'text-violet-200 hover:bg-white/10 hover:text-white border border-transparent',
                      ].join(' ')}
                    >
                      {/* Active indicator bar */}
                      <span
                        className={[
                          'w-0.5 h-4 rounded-full transition-all duration-200 flex-shrink-0',
                          isItemActive ? 'bg-gradient-to-b from-violet-300 to-indigo-300 shadow-glow' : 'bg-transparent',
                        ].join(' ')}
                      />
                      <item.icon size={17} />
                      {item.label}
                      {isItemActive && (
                        <ChevronLeft size={14} className="ml-auto rotate-180 text-violet-300" />
                      )}
                    </Link>
                  );
                })()
              )}
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
