import { Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './components/AppLayout';
import { ActivitiesPage } from './pages/admin/Activities/ActivitiesPage';
import { AdminLayout } from './pages/admin/AdminLayout';
import { AIInboxPage } from './pages/admin/AIInbox/AIInboxPage';
import { ChildrenPage } from './pages/admin/Children/ChildrenPage';
import { SubjectsPage } from './pages/admin/Subjects/SubjectsPage';
import { TasksPage } from './pages/admin/Tasks/TasksPage';
import { TopicsPage } from './pages/admin/Topics/TopicsPage';
import { DashboardPage } from './pages/DashboardPage';
import { InboxPage } from './pages/InboxPage';
import { LoginPage } from './pages/LoginPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/inbox" element={<InboxPage />} />
      </Route>
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/children" replace />} />
        <Route path="children" element={<ChildrenPage />} />
        <Route path="subjects" element={<SubjectsPage />} />
        <Route path="topics" element={<TopicsPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="activities" element={<ActivitiesPage />} />
        <Route path="ai-inbox" element={<AIInboxPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
