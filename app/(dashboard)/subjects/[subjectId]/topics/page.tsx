'use client';
import { useParams, useSearchParams } from 'next/navigation';
import { useAuth } from '@/src/context/AuthContext';
import { CurriculumPage } from '@/src/views/new/CurriculumPage';
import { TopicsPage } from '@/src/views/new/TopicsPage';

export default function Page() {
  const { isAdmin } = useAuth();
  const { subjectId } = useParams<{ subjectId: string }>();
  const searchParams = useSearchParams();
  const autoOpenAI = searchParams.get('ai') === '1';

  if (!isAdmin) return <TopicsPage />;
  return <CurriculumPage initialSubjectId={subjectId} autoOpenAI={autoOpenAI} />;
}
