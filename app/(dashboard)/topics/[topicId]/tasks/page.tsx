'use client';
import { useParams } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { CurriculumPage } from '@/src/views/new/CurriculumPage';
import { TasksListPage } from '@/src/views/new/TasksListPage';

export default function Page() {
  const { isAdmin } = useAuth();
  const { topicId } = useParams<{ topicId: string }>();

  if (!isAdmin) return <TasksListPage />;
  return <CurriculumPage initialTopicId={topicId} initialView="tasks" />;
}
