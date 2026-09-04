'use client';

import { BookOpen, CalendarCheck, Home, MoreHorizontal, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const BOTTOM_NAV_ITEMS = [
  { label: 'Today', path: '/', icon: Home },
  { label: 'Week', path: '/planner', icon: CalendarCheck },
  { label: 'Curriculum', path: '/subjects', icon: BookOpen },
  { label: 'Progress', path: '/progress', icon: TrendingUp },
  { label: 'More', path: '/settings', icon: MoreHorizontal },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 border-t border-violet-100 bg-white/95 px-2 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-1.5 shadow-[0_-8px_24px_rgba(30,27,75,0.08)] backdrop-blur-md lg:hidden"
      aria-label="Parent navigation"
    >
      <div className="mx-auto grid max-w-lg grid-cols-5 gap-0.5">
        {BOTTOM_NAV_ITEMS.map((item) => {
          const isActive = item.path === '/' ? pathname === '/' : pathname.startsWith(item.path);
          const Icon = item.icon;

          return (
            <Link
              key={item.path}
              href={item.path}
              className={[
                'flex min-h-[3.35rem] flex-col items-center justify-center gap-1 rounded-lg px-1 text-[11px] font-bold leading-none transition-all duration-200',
                isActive
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800',
              ].join(' ')}
              aria-current={isActive ? 'page' : undefined}
            >
              <Icon size={19} strokeWidth={isActive ? 2.5 : 2} />
              <span className="max-w-full truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}