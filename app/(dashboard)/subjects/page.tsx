'use client';
import { useAuth } from '@/src/context/AuthContext';
import { CurriculumPage } from '@/src/views/new/CurriculumPage';
import { SubjectsPage } from '@/src/views/new/SubjectsPage';

export default function Page() {
  const { isAdmin } = useAuth();
  // Admins get the unified Curriculum Builder; students keep the existing
  // read-oriented view (out of scope for this redesign pass).
  return isAdmin ? <CurriculumPage /> : <SubjectsPage />;
}
