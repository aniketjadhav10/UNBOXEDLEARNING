// ============================================================
// Navbar — Top bar with hamburger, title, and user avatar
// ============================================================
import { Bell, Menu, Search } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavbarProps {
  onMenuToggle: () => void;
  pageTitle?: string;
}

export function Navbar({ onMenuToggle, pageTitle = 'Dashboard' }: NavbarProps) {
  const { user, isAdmin } = useAuth();

  return (
    <header className="sticky top-0 z-20 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="flex items-center justify-between h-16 px-4 lg:px-6">

        {/* ── Left: Hamburger + Title ──────────────────────── */}
        <div className="flex items-center gap-3">
          {/* Hamburger — visible on mobile only */}
          <button
            id="sidebar-toggle"
            onClick={onMenuToggle}
            className="lg:hidden p-2 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu size={20} />
          </button>

          {/* Page title */}
          <div>
            <h1 className="text-base font-bold text-gray-900 leading-tight">{pageTitle}</h1>
            <p className="text-xs text-gray-400 hidden sm:block">
              {isAdmin ? 'Admin Panel' : 'My Learning Space'}
            </p>
          </div>
        </div>

        {/* ── Right: Search + Notifications + Avatar ──────── */}
        <div className="flex items-center gap-2">
          {/* Search button (decorative for now) */}
          <button
            id="search-btn"
            className="p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Search"
          >
            <Search size={18} />
          </button>

          {/* Notifications */}
          <button
            id="notifications-btn"
            className="relative p-2 rounded-xl text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors"
            aria-label="Notifications"
          >
            <Bell size={18} />
            {/* Dot badge */}
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-violet-500 rounded-full ring-2 ring-white" />
          </button>

          {/* Avatar */}
          <button
            id="user-avatar-btn"
            className={[
              'w-9 h-9 rounded-full bg-gradient-to-br flex items-center justify-center',
              'text-white text-xs font-bold ring-2 ring-violet-200 hover:ring-violet-400',
              'transition-all duration-200 cursor-pointer',
              user?.avatarColor ?? 'from-violet-500 to-purple-600',
            ].join(' ')}
            aria-label="User menu"
          >
            {user?.avatarInitials ?? '?'}
          </button>
        </div>
      </div>
    </header>
  );
}
