'use client';

// ============================================================
// app/providers.tsx — Client boundary wrapping all providers
// Replaces src/App.tsx
// ============================================================
import { ErrorBoundary } from '@/src/components/ErrorBoundary';
import { GlobalToast } from '@/src/components/ui/GlobalToast';
import { AuthProvider } from '@/src/context/AuthContext';
import { DataProvider } from '@/src/context/DataContext';
import { AppearanceManager } from '@/src/components/AppearanceManager';
import type { ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <AppearanceManager />
          {children}
          <GlobalToast />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
