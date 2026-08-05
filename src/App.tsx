// ============================================================
// App.tsx — Root: ErrorBoundary → AuthProvider → DataProvider → AppRoutes + GlobalToast
// ============================================================
import { ErrorBoundary } from './components/ErrorBoundary';
import { GlobalToast }   from './components/ui/GlobalToast';
import { AuthProvider }  from './context/AuthContext';
import { DataProvider }  from './context/DataContext';
import { AppRoutes }     from './routes/AppRoutes';

import { AppearanceManager } from './components/AppearanceManager';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <DataProvider>
          <AppearanceManager />
          <AppRoutes />
          {/* Global toast renderer — reads from useToastStore */}
          <GlobalToast />
        </DataProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
