'use client';
// app/(dashboard)/layout.tsx — Shared layout with Sidebar + Navbar for all protected pages
// Replaces the role in AppRoutes.tsx where MainLayout was rendered via <Route element={<MainLayout />}>
import { MainLayout } from '@/src/layouts/MainLayout';
import type { ReactNode } from 'react';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <MainLayout>{children}</MainLayout>;
}
