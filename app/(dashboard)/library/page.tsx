'use client';
import { useAuth } from '@/src/context/AuthContext';
import { CurriculumPage } from '@/src/views/new/CurriculumPage';
import { SubjectLibraryPage } from '@/src/views/new/SubjectLibraryPage';

export default function Page() {
  const { isAdmin } = useAuth();
  return isAdmin ? <CurriculumPage initialTab="library" /> : <SubjectLibraryPage />;
}
