import { BookOpen, Home, Inbox, Wifi, WifiOff } from 'lucide-react';
import { NavLink, Outlet } from 'react-router-dom';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

const navItems = [
  { href: '/', label: 'Dashboard', icon: Home },
  { href: '/inbox', label: 'AI Inbox', icon: Inbox },
];

export function AppLayout() {
  const online = useOnlineStatus();

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <header className="border-b border-black/10 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md bg-moss text-white">
              <BookOpen aria-hidden="true" size={22} />
            </div>
            <div>
              <p className="text-lg font-semibold text-ink">Homeschool Manager</p>
              <p className="text-sm text-ink/60">Plan lessons, track progress, keep learning moving.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-md border border-black/10 px-3 py-2 text-sm">
            {online ? <Wifi size={16} /> : <WifiOff size={16} />}
            <span>{online ? 'Online' : 'Offline'}</span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-6xl gap-6 px-4 py-6 md:grid-cols-[220px_1fr]">
        <nav className="flex gap-2 md:flex-col">
          {navItems.map((item) => (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) =>
                [
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
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
