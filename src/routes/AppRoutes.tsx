// ============================================================
// AppRoutes — Auth-aware routing with role-based guards
// ============================================================
import { Navigate, Route, Routes } from 'react-router-dom';
import { GraduationCap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { MainLayout } from '../layouts/MainLayout';
import { LoginPage } from '../pages/LoginPage';

// Pages
import { DashboardPage } from '../pages/new/DashboardPage';
import { KidsPage } from '../pages/new/KidsPage';
import { KidProfilePage } from '../pages/new/KidProfilePage';
import { SubjectsPage } from '../pages/new/SubjectsPage';
import { TopicsPage } from '../pages/new/TopicsPage';
import { ActivitiesPage } from '../pages/new/ActivitiesPage';
import { ReportsPage } from '../pages/new/ReportsPage';
import { SettingsPage } from '../pages/new/SettingsPage';
import { MyLearningPage } from '../pages/new/MyLearningPage';
import { ProgressPage } from '../pages/new/ProgressPage';
import { ProfilePage } from '../pages/new/ProfilePage';
import { TaskManagementPage } from '../pages/new/TaskManagementPage';
import { TasksListPage } from '../pages/new/TasksListPage';
import { ActivitiesListPage } from '../pages/new/ActivitiesListPage';
import { ThisWeekPage } from '../pages/new/ThisWeekPage';
import { FamilyPage } from '../pages/admin/Family/FamilyPage';

// ── Full-screen loading while resolving Supabase session ──────
function SessionLoader() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-[#1e1b4b] to-[#312e81]">
      <div className="w-14 h-14 bg-gradient-to-br from-violet-400 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl mb-5 animate-pulse">
        <GraduationCap size={28} className="text-white" />
      </div>
      <p className="text-violet-300 text-sm font-medium">Loading UnBoxed Learning…</p>
    </div>
  );
}

// ── Guards ────────────────────────────────────────────────────

/** Redirect to /login if no active session */
function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, authLoading } = useAuth();
  if (authLoading) return <SessionLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

/** Redirect non-admin users away from admin-only routes */
function AdminRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

/** Redirect admin users away from student-only routes */
function StudentRoute({ children }: { children: React.ReactNode }) {
  const { isAdmin } = useAuth();
  return !isAdmin ? <>{children}</> : <Navigate to="/" replace />;
}

// ── Routes ────────────────────────────────────────────────────
export function AppRoutes() {
  return (
    <Routes>
      {/* ── Public ───────────────────────────────────────── */}
      <Route path="/login" element={<LoginPage />} />

      {/* ── Protected (requires Supabase session) ─────────── */}
      <Route
        element={
          <AuthGuard>
            <MainLayout />
          </AuthGuard>
        }
      >
        {/* Shared */}
        <Route index element={<DashboardPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="subjects/:subjectId/topics" element={<TopicsPage />} />
        <Route path="topics/:topicId/tasks" element={<TasksListPage />} />
        <Route path="tasks/:taskId/activities" element={<ActivitiesListPage />} />

        {/* Admin-only / Management */}
        <Route path="kids" element={<AdminRoute><KidsPage /></AdminRoute>} />
        <Route path="kids/:kidId" element={<AdminRoute><KidProfilePage /></AdminRoute>} />
        <Route path="topics" element={<AdminRoute><TopicsPage /></AdminRoute>} />
        <Route path="activities" element={<AdminRoute><ActivitiesPage /></AdminRoute>} />
        {<Route path="tasks" element={<AdminRoute><TaskManagementPage /></AdminRoute>} />}
        {<Route path="scheduled" element={<AdminRoute><TaskManagementPage defaultTab="scheduled" /></AdminRoute>} />}
        {<Route path="archived" element={<AdminRoute><TaskManagementPage defaultTab="archived" /></AdminRoute>} />}
        <Route path="this-week" element={<ThisWeekPage />} />
        <Route path="reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
        <Route path="settings" element={<AdminRoute><SettingsPage /></AdminRoute>} />
        <Route path="family" element={<AdminRoute><FamilyPage /></AdminRoute>} />

        {/* Student-only */}
        <Route path="my-learning" element={<StudentRoute><MyLearningPage /></StudentRoute>} />
        <Route path="progress" element={<StudentRoute><ProgressPage /></StudentRoute>} />
        <Route path="profile" element={<StudentRoute><ProfilePage /></StudentRoute>} />

        {/* 404 */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
