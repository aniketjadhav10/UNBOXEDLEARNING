// ============================================================
// App.tsx — Root: AuthProvider → DataProvider → AppRoutes
// ============================================================
import { AuthProvider } from './context/AuthContext';
import { DataProvider }  from './context/DataContext';
import { AppRoutes }     from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <DataProvider>
        <AppRoutes />
      </DataProvider>
    </AuthProvider>
  );
}
