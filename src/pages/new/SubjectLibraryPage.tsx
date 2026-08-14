// ============================================================
// SubjectLibraryPage — Browse all global subjects, enroll child
// ============================================================
import React, { useState, useEffect, useMemo } from 'react';
import { BookOpen, Search, Plus, CheckCircle2, Loader2, LibraryBig, Tag, LayoutGrid, List, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../store/useToastStore';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { useDebounce } from '../../hooks/useDebounce';
import { subjectEmoji, colorToGradient } from '../../services/dataService';
import {
  fetchAllSubjectsFromLibrary,
  enrollInSubject,
  isEnrolledInSubject,
  createSubjectAndEnroll,
} from '../../services/curriculumService';
import { BackButton } from '../../components/ui/BackButton';
import { TopicPickerDrawer } from '../../components/curriculum/TopicPickerDrawer';
import type { DbSubject } from '../../types/database';

type SubjectWithEnrollment = DbSubject & { isEnrolled: boolean };

export function SubjectLibraryPage() {
  useDocumentTitle('Subject Library');
  const navigate = useNavigate();
  const toast = useToast();
  const { kids, refresh } = useData();
  const { selectedChildId } = useSettingsStore();
  const { user } = useAuth();

  const childId = selectedChildId || kids[0]?.id || '';

  const [subjects, setSubjects] = useState<SubjectWithEnrollment[]>([]);
  const [loading, setLoading] = useState(true);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [selectedGrade, setSelectedGrade] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [pickerSubjectId, setPickerSubjectId] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 300);

  useEffect(() => {
    loadLibrary();
  }, [childId]);

  async function loadLibrary() {
    try {
      setLoading(true);
      const allSubjects = await fetchAllSubjectsFromLibrary();

      // Check enrollment status for each subject and filter out enrolled ones
      const withEnrollment = await Promise.all(
        allSubjects.map(async (s) => ({
          ...s,
          isEnrolled: childId ? await isEnrolledInSubject(childId, s.id) : false,
        }))
      );
      // Filter out fully enrolled subjects based on user request
      const unassignedSubjects = withEnrollment.filter((s) => !s.isEnrolled);
      setSubjects(unassignedSubjects);
    } catch (err) {
      console.error('Failed to load library', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleEnrollAll(subjectId: string) {
    if (!childId) {
      toast.error('Please select a child first.');
      return;
    }
    setEnrollingId(subjectId);
    try {
      await enrollInSubject(childId, subjectId);
      setSubjects((prev) =>
        prev.map((s) => (s.id === subjectId ? { ...s, isEnrolled: true } : s))
      );
      toast.success('Enrolled in all topics!');
      refresh();
    } catch (err) {
      toast.error('Failed to enroll.');
    } finally {
      setEnrollingId(null);
    }
  }

  // Collect all unique tags and grades
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    subjects.forEach((s) => (s.tags ?? []).forEach((t) => tags.add(t)));
    return Array.from(tags).sort();
  }, [subjects]);

  const allGrades = useMemo(() => {
    const grades = new Set<string>();
    subjects.forEach((s) => (s.grade_levels ?? []).forEach((g) => grades.add(g)));
    return Array.from(grades).sort();
  }, [subjects]);

  const filtered = useMemo(() => {
    return subjects.filter((s) => {
      const matchSearch =
        !debouncedSearch ||
        s.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        (s.description ?? '').toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchTag = !selectedTag || (s.tags ?? []).includes(selectedTag);
      const matchGrade = !selectedGrade || (s.grade_levels ?? []).includes(selectedGrade);
      return matchSearch && matchTag && matchGrade;
    });
  }, [subjects, debouncedSearch, selectedTag, selectedGrade]);

  return (
    <div className="max-w-6xl mx-auto space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <BackButton />
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2 mt-1">
            <LibraryBig className="w-7 h-7 text-violet-600" />
            Subject Library
          </h1>
          <p className="text-sm text-gray-400 mt-0.5">
            Browse and enroll your child in subjects or pick individual topics
          </p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search subjects..."
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:border-violet-400 bg-gray-50"
            />
          </div>
          <div className="flex gap-2">
            <select
              value={selectedGrade}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="px-3 py-2.5 text-sm font-semibold border border-gray-200 rounded-xl bg-gray-50 text-gray-700 outline-none focus:border-violet-400"
            >
              <option value="">All Grades</option>
              {allGrades.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
            <div className="flex bg-gray-100 p-1 rounded-xl">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-white shadow text-violet-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <LayoutGrid size={18} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-white shadow text-violet-600' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setSelectedTag('')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              !selectedTag ? 'bg-violet-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All Subjects
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag === selectedTag ? '' : tag)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1 ${
                selectedTag === tag
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <Tag size={11} />
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* Grid/List */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-56 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <BookOpen size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-bold text-lg">No subjects found</p>
          <p className="text-sm">Try adjusting your search or filters</p>
        </div>
      ) : (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
          {filtered.map((subject) => (
            <SubjectLibraryCard
              key={subject.id}
              subject={subject}
              viewMode={viewMode}
              isEnrolled={subject.isEnrolled}
              enrollingId={enrollingId}
              onEnrollAll={() => handleEnrollAll(subject.id)}
              onPickTopics={() => setPickerSubjectId(subject.id)}
              onNavigate={() => navigate(`/subjects/${subject.id}/topics`)}
            />
          ))}
        </div>
      )}

      {/* Topic Picker Drawer */}
      {pickerSubjectId && (
        <TopicPickerDrawer
          subjectId={pickerSubjectId}
          childId={childId}
          onClose={() => setPickerSubjectId(null)}
          onEnrolled={() => { refresh(); loadLibrary(); }}
        />
      )}
    </div>
  );
}

// ── Subject Card ─────────────────────────────────────────────

function SubjectLibraryCard({
  subject,
  isEnrolled,
  enrollingId,
  viewMode,
  onEnrollAll,
  onPickTopics,
  onNavigate,
}: {
  subject: DbSubject;
  isEnrolled: boolean;
  enrollingId: string | null;
  viewMode: 'grid' | 'list';
  onEnrollAll: () => void;
  onPickTopics: () => void;
  onNavigate: () => void;
}) {
  const isLoading = enrollingId === subject.id;
  const gradient = colorToGradient(subject.color);
  const isCommunity = !!subject.created_by;

  if (viewMode === 'list') {
    return (
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow transition-all duration-200 overflow-hidden flex relative hover:-translate-y-0.5">
        <div className={`w-2 h-full absolute left-0 top-0 bg-gradient-to-b ${gradient}`} />
        <div className="pl-6 pr-4 py-4 flex flex-1 items-center gap-4">
          <div className="text-3xl">{subjectEmoji(subject.name)}</div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-bold text-gray-900 text-base truncate">{subject.name}</h3>
              {isCommunity && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100">
                  <Users size={10} /> Community
                </span>
              )}
              {isEnrolled && <CheckCircle2 className="text-emerald-500" size={16} />}
            </div>
            <p className="text-xs text-gray-500 truncate mb-1">
              {subject.description ?? `Learn about ${subject.name}.`}
            </p>
            <div className="flex items-center gap-2">
              {(subject.grade_levels ?? []).length > 0 && (
                <span className="text-[10px] text-gray-400 font-medium">Grades: {subject.grade_levels.join(', ')}</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={onPickTopics}
              className="px-4 py-2 text-xs font-semibold text-violet-600 border border-violet-200 rounded-lg hover:bg-violet-50 transition-colors"
            >
              Preview
            </button>
            <button
              onClick={isEnrolled ? onNavigate : onEnrollAll}
              disabled={isLoading}
              className="px-4 py-2 text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-colors disabled:opacity-60 w-[120px] text-center shadow-sm"
            >
              {isLoading ? 'Wait...' : isEnrolled ? 'Open' : '+ Enroll All'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col relative hover:-translate-y-1">
      {/* Background soft gradient overlay based on subject color */}
      <div 
        className="absolute inset-0 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none" 
        style={{ backgroundImage: `linear-gradient(to bottom right, white, ${subject.color})` }} 
      />
      
      {/* Color bar */}
      <div className={`h-2.5 bg-gradient-to-r ${gradient}`} />

      <div className="p-5 flex flex-col flex-1 relative z-10">
        {/* Header */}
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{subjectEmoji(subject.name)}</span>
            <div>
              <h3 className="font-bold text-gray-900 text-sm leading-tight">{subject.name}</h3>
              {isCommunity && (
                <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-100 mt-1 w-max">
                  <Users size={10} /> Community
                </span>
              )}
            </div>
          </div>
          {isEnrolled && (
            <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={18} />
          )}
        </div>

        <p className="text-xs text-gray-500 mb-4 line-clamp-2 flex-1">
          {subject.description ?? `Learn about ${subject.name}.`}
        </p>

        {/* Tags */}
        {(subject.tags ?? []).length > 0 && (
          <div className="flex flex-wrap gap-1 mb-4 mt-auto">
            {subject.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-2 py-0.5 bg-gray-50 text-gray-500 rounded border border-gray-100 text-[10px] font-bold uppercase tracking-wider">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Grade levels */}
        {(subject.grade_levels ?? []).length > 0 && (
          <p className="text-xs text-gray-400 mb-3 font-medium">
            Grades: {subject.grade_levels.join(', ')}
          </p>
        )}

        {/* Actions */}
        <div className="flex gap-2 mt-auto pt-2 border-t border-gray-50">
          <button
            onClick={onPickTopics}
            className="flex-1 py-2 text-xs font-semibold text-violet-600 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors"
          >
            Preview Curriculum
          </button>
          <button
            onClick={isEnrolled ? onNavigate : onEnrollAll}
            disabled={isLoading}
            className="flex-1 py-2 text-[11px] font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-1 shadow-sm hover:shadow"
          >
            {isLoading ? (
              <Loader2 size={12} className="animate-spin" />
            ) : isEnrolled ? (
              'View Topics'
            ) : (
              <>
                <Plus size={12} /> Enroll Child
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
