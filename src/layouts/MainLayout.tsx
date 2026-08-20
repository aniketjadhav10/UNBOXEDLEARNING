// ============================================================
// MainLayout — Root layout: Sidebar + Navbar + Content area
// Updated for Next.js: uses usePathname/useRouter instead of react-router-dom
// ============================================================
'use client';
import { useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Navbar } from '../components/Navbar';
import { Sidebar } from '../components/Sidebar';
import { PageTransition } from '../components/motion/PageTransition';
import { FloatingChat } from '../components/chat/FloatingChat';

/* Map path segments → readable page titles */
const PAGE_TITLES: Record<string, string> = {
  '':            'Dashboard',
  'kids':        'Kids',
  'subjects':    'Subjects',
  'topics':      'All Topics',
  'activities':  'Activities',
  'tasks':       'Learning Tasks',
  'this-week':   'This Week',
  'reports':     'Reports',
  'settings':    'Settings',
  'family':      'Family Workspace',
  'my-learning': 'My Learning',
  'progress':    'My Progress',
  'profile':     'My Profile',
  'syllabus-generator': 'AI Syllabus Generator',
  'library':           'Subject Library',
  'learning-path':     'Learning Path',
  'lesson':            'Lesson',
};

function usePageTitle(): string {
  const pathname = usePathname();
  const segments = pathname.split('/').filter(Boolean);
  // Handle /subjects/:id/topics
  if (segments[0] === 'subjects' && segments[2] === 'topics') return 'Topics';
  if (segments[0] === 'kids' && segments[1])                   return 'Kid Profile';
  const key = segments[0] ?? '';
  return PAGE_TITLES[key] ?? 'UnBoxed Learning';
}

export function MainLayout({ children }: { children?: ReactNode }) {
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

        {/* Scrollable content area with page transitions */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6"
        >
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* ── Global Floating Chat ────────────────────────────── */}
      <FloatingChat />
    </div>
  );
}
