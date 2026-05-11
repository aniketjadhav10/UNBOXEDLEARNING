// ============================================================
// MainLayout — Root layout: Sidebar + Navbar + Content area
// ============================================================
import { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';

/* Map path segments → readable page titles */
const PAGE_TITLES: Record<string, string> = {
  '':            'Dashboard',
  'kids':        'Kids',
  'subjects':    'Subjects',
  'topics':      'All Topics',
  'activities':  'Activities',
  'tasks':       'Learning Tasks',
  'reports':     'Reports',
  'settings':    'Settings',
  'my-learning': 'My Learning',
  'progress':    'My Progress',
  'profile':     'My Profile',
};

function usePageTitle(): string {
  const { pathname } = useLocation();
  const segments = pathname.split('/').filter(Boolean);
  // Handle /subjects/:id/topics
  if (segments[0] === 'subjects' && segments[2] === 'topics') return 'Topics';
  if (segments[0] === 'kids' && segments[1])                   return 'Kid Profile';
  const key = segments[0] ?? '';
  return PAGE_TITLES[key] ?? 'UnBoxed Learning';
}

export function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pageTitle = usePageTitle();

  return (
    <div className="flex h-screen overflow-hidden bg-[#f5f3ff]">
      {/* ── Sidebar ─────────────────────────────────────────── */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* ── Main column ─────────────────────────────────────── */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Sticky top navbar */}
        <Navbar
          onMenuToggle={() => setSidebarOpen((v) => !v)}
          pageTitle={pageTitle}
        />

        {/* Scrollable content area */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto px-4 py-6 lg:px-6 lg:py-8"
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
