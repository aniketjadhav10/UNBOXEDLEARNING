// ============================================================
// RoadmapPage — the "Learning GPS": a per-child skill tree that answers
// "what should my child learn next?" Skills are bucketed Completed / Current /
// Next / Locked from the prerequisite graph, with a recommended-next banner.
// Backed by roadmapService (RPCs) + skillService (objectives, prereqs, actions).
// ============================================================
'use client';
import React, { useEffect, useMemo, useState } from 'react';
import {
  Route, CheckCircle2, Lock, PlayCircle, Circle, Loader2, Sparkles, X, ChevronRight, Target,
} from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useSettingsStore } from '../../store/useSettingsStore';
import { useDocumentTitle } from '../../hooks/useDocumentTitle';
import { BackButton } from '../../components/ui/BackButton';
import {
  fetchRoadmap, fetchRecommendedSkills, type RoadmapNode, type NextSkill, type RoadmapBucket,
} from '../../services/roadmapService';
import {
  fetchObjectives, markSkillPracticed, setSkillStatus, type LearningObjective,
} from '../../services/skillService';
import { MASTERY_LADDER, LADDER_ORDER, masteryRung, type LearningStage } from '../../lib/masteryLadder';
import { estimateMasteryEta } from '../../lib/masteryEta';
import { StandardsCoverageCard } from '../../components/curriculum/StandardsCoverageCard';

/** "~Mastery by Jun 3" for an in-progress skill with enough history, else null. */
function etaLabel(node: RoadmapNode): string | null {
  const eta = estimateMasteryEta({
    status: node.status,
    practiceCount: node.practice_count,
    startedAt: node.started_at,
    lastPracticedAt: node.last_practiced_at,
  });
  if (eta.mastered || !eta.etaDate) return null;
  return new Date(eta.etaDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

const LEVEL_NAMES: Record<number, string> = {
  1: 'Early Foundations', 2: 'Building Blocks', 3: 'Intermediate', 4: 'Advanced', 5: 'Higher',
};

const BUCKET_META: Record<RoadmapBucket, { label: string; icon: React.ReactNode; card: string; ring: string }> = {
  completed: { label: 'Completed', icon: <CheckCircle2 size={16} />, card: 'bg-emerald-50 border-emerald-200', ring: 'bg-emerald-500 text-white' },
  current:   { label: 'Current',   icon: <PlayCircle size={16} />,  card: 'bg-violet-50 border-violet-200',   ring: 'bg-violet-500 text-white' },
  next:      { label: 'Next',      icon: <Circle size={16} />,      card: 'bg-white border-sky-200',          ring: 'bg-sky-100 text-sky-600' },
  locked:    { label: 'Locked',    icon: <Lock size={16} />,        card: 'bg-gray-50 border-gray-200 opacity-70', ring: 'bg-gray-200 text-gray-400' },
};

export function RoadmapPage() {
  useDocumentTitle('Learning Roadmap');
  const { kids, subjects } = useData();
  const { selectedChildId } = useSettingsStore();

  const childId = selectedChildId || kids[0]?.id || '';
  const child = kids.find((k) => k.id === childId);

  const [subjectId, setSubjectId] = useState('');
  const [nodes, setNodes] = useState<RoadmapNode[]>([]);
  const [recommended, setRecommended] = useState<NextSkill[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openSkill, setOpenSkill] = useState<RoadmapNode | null>(null);

  // Default to the first subject once data arrives.
  useEffect(() => {
    if (!subjectId && subjects.length > 0) setSubjectId(subjects[0].id);
  }, [subjects, subjectId]);

  useEffect(() => {
    if (childId && subjectId) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [childId, subjectId]);

  async function load() {
    try {
      setLoading(true);
      setError(null);
      const [tree, next] = await Promise.all([
        fetchRoadmap(childId, subjectId),
        fetchRecommendedSkills(childId, subjectId, 5),
      ]);
      setNodes(tree);
      setRecommended(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load roadmap');
    } finally {
      setLoading(false);
    }
  }

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const byLevel = useMemo(() => {
    const map = new Map<number, RoadmapNode[]>();
    for (const n of nodes) {
      const arr = map.get(n.level) ?? [];
      arr.push(n);
      map.set(n.level, arr);
    }
    return [...map.entries()].sort((a, b) => a[0] - b[0]);
  }, [nodes]);

  const completedCount = nodes.filter((n) => n.bucket === 'completed').length;
  const progressPct = nodes.length ? Math.round((completedCount / nodes.length) * 100) : 0;
  const topPick = recommended[0];

  return (
    <div className="max-w-3xl mx-auto space-y-6 animate-fade-in pb-24">
      {/* Header */}
      <div>
        <BackButton />
        <div className="flex items-center justify-between mt-1">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Route className="w-6 h-6 text-violet-600" />
              Learning Roadmap
            </h1>
            {child && <p className="text-sm text-gray-400 mt-0.5">{child.name}&apos;s skill journey</p>}
          </div>
        </div>
      </div>

      {/* Subject selector */}
      {subjects.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {subjects.map((s) => (
            <button
              key={s.id}
              onClick={() => setSubjectId(s.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all ${
                s.id === subjectId ? 'bg-violet-600 text-white shadow' : 'bg-white text-gray-600 border border-gray-200 hover:border-violet-300'
              }`}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}

      {/* Recommended next */}
      {topPick && (
        <button
          onClick={() => setOpenSkill(nodeById.get(topPick.id) ?? null)}
          className="w-full text-left bg-gradient-to-r from-violet-600 to-indigo-600 rounded-2xl p-5 text-white shadow-lg hover:shadow-xl transition-shadow"
        >
          <div className="flex items-center gap-2 text-violet-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles size={14} /> Recommended next
          </div>
          <p className="text-lg font-black">{topPick.name}</p>
          <p className="text-violet-100 text-sm mt-1">{topPick.reason}</p>
          {recommended.length > 1 && (
            <p className="text-violet-200 text-xs mt-2">+{recommended.length - 1} more ready to start</p>
          )}
        </button>
      )}

      {/* Progress summary */}
      {nodes.length > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-gray-500">Overall mastery</p>
            <p className="text-sm font-bold text-gray-900">{completedCount} of {nodes.length} skills</p>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-violet-500 to-emerald-500 rounded-full transition-all duration-700" style={{ width: `${progressPct}%` }} />
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-20"><Loader2 className="animate-spin text-violet-500" size={32} /></div>
      ) : error ? (
        <div className="text-center py-16 text-gray-500 bg-rose-50 border border-rose-100 rounded-2xl px-6">
          <p className="font-bold text-rose-700">Couldn&apos;t load the roadmap</p>
          <p className="text-sm mt-1 text-rose-600">{error}</p>
          <p className="text-xs mt-3 text-gray-500">If you just set this up, make sure the roadmap migrations are applied.</p>
        </div>
      ) : nodes.length === 0 ? (
        <div className="text-center py-20 text-gray-400">
          <Target size={48} className="mx-auto mb-3 opacity-20" />
          <p className="font-bold text-lg">No skills mapped yet</p>
          <p className="text-sm">Generate a curriculum for this subject to build the skill tree.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {byLevel.map(([level, levelNodes]) => (
            <div key={level}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-violet-600 bg-violet-50 px-2 py-0.5 rounded-full">
                  Level {level}
                </span>
                <h2 className="text-sm font-bold text-gray-700">{LEVEL_NAMES[level] ?? ''}</h2>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 gap-2">
                {levelNodes.map((n) => (
                  <SkillCard key={n.id} node={n} onClick={() => setOpenSkill(n)} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {subjectId && !loading && !error && nodes.length > 0 && (
        <StandardsCoverageCard subjectId={subjectId} subjectName={subjects.find((s) => s.id === subjectId)?.name} />
      )}

      {openSkill && (
        <SkillDetailModal
          node={openSkill}
          nodeById={nodeById}
          childId={childId}
          onClose={() => setOpenSkill(null)}
          onChanged={load}
        />
      )}
    </div>
  );
}

// ── Skill card ────────────────────────────────────────────────────────────────
function SkillCard({ node, onClick }: { node: RoadmapNode; onClick: () => void }) {
  const meta = BUCKET_META[node.bucket];
  const rung = masteryRung(node.status);
  const eta = node.bucket === 'current' ? etaLabel(node) : null;
  return (
    <button
      onClick={onClick}
      className={`w-full p-4 rounded-xl border transition-all text-left flex items-center gap-4 group ${meta.card} hover:shadow-md`}
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${meta.ring}`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-gray-900 truncate">{node.name}</p>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${rung.chip}`}>
            {rung.emoji} {rung.label}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">{meta.label}</span>
          {eta && (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-600">🎯 ~Mastery by {eta}</span>
          )}
        </div>
      </div>
      <ChevronRight size={18} className="text-gray-300 group-hover:text-violet-500 group-hover:translate-x-1 transition-all flex-shrink-0" />
    </button>
  );
}

// ── Skill detail modal ────────────────────────────────────────────────────────
function SkillDetailModal({
  node, nodeById, childId, onClose, onChanged,
}: {
  node: RoadmapNode;
  nodeById: Map<string, RoadmapNode>;
  childId: string;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [objectives, setObjectives] = useState<LearningObjective[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchObjectives(node.id).then(setObjectives).catch(() => setObjectives([]));
  }, [node.id]);

  const prereqs = node.prerequisite_ids.map((id) => nodeById.get(id)).filter(Boolean) as RoadmapNode[];
  const rung = masteryRung(node.status);

  async function practiced(success: boolean) {
    try {
      setSaving(true);
      await markSkillPracticed(childId, node.id, { success });
      onChanged();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(status: LearningStage) {
    try {
      setSaving(true);
      await setSkillStatus(childId, node.id, status);
      onChanged();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div
        className="bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-2xl max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between p-5 border-b border-gray-100 sticky top-0 bg-white">
          <div>
            <h3 className="text-lg font-bold text-gray-900">{node.name}</h3>
            <span className={`inline-block mt-1 text-[11px] font-bold px-2 py-0.5 rounded-full ${rung.chip}`}>
              {rung.emoji} {rung.label}
            </span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1"><X size={20} /></button>
        </div>

        <div className="p-5 space-y-5">
          {node.description && <p className="text-sm text-gray-600">{node.description}</p>}

          {(() => {
            const eta = estimateMasteryEta({
              status: node.status, practiceCount: node.practice_count,
              startedAt: node.started_at, lastPracticedAt: node.last_practiced_at,
            });
            if (eta.mastered) return null;
            if (!eta.etaDate) return null;
            const d = new Date(eta.etaDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
            return (
              <p className="text-sm text-indigo-700 bg-indigo-50 rounded-lg px-3 py-2">
                🎯 At this pace, mastery by <span className="font-bold">{d}</span>
                {eta.perWeek ? ` · ~${eta.perWeek}/week` : ''}
              </p>
            );
          })()}

          {prereqs.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Prerequisites</p>
              <div className="space-y-1.5">
                {prereqs.map((p) => (
                  <div key={p.id} className="flex items-center gap-2 text-sm">
                    {p.bucket === 'completed'
                      ? <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                      : <Circle size={15} className="text-gray-300 flex-shrink-0" />}
                    <span className={p.bucket === 'completed' ? 'text-gray-500 line-through' : 'text-gray-800'}>{p.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {objectives.length > 0 && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Learning objectives</p>
              <ul className="space-y-1.5">
                {objectives.map((o) => (
                  <li key={o.id} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-violet-400 mt-0.5">•</span>{o.description}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="pt-1 space-y-3">
            <div className="flex gap-2">
              <button
                disabled={saving}
                onClick={() => practiced(true)}
                className="flex-1 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                Practiced ✓
              </button>
              <button
                disabled={saving}
                onClick={() => practiced(false)}
                className="flex-1 py-2.5 bg-amber-100 text-amber-700 text-sm font-bold rounded-xl hover:bg-amber-200 disabled:opacity-50 transition-colors"
              >
                Struggled
              </button>
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-gray-500">Set mastery</label>
              <select
                disabled={saving}
                value={node.status}
                onChange={(e) => changeStatus(e.target.value as LearningStage)}
                className="mt-1 w-full px-3 py-2.5 text-sm border border-gray-200 rounded-xl bg-gray-50 focus:outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              >
                {LADDER_ORDER.map((s) => (
                  <option key={s} value={s}>{MASTERY_LADDER[s].emoji} {MASTERY_LADDER[s].label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
