// ============================================================
// SyllabusReviewPanel — review-before-save for AI generation.
// Renders the assembled draft (subject → topics → skills → tasks) as an
// editable/trimmable tree. The parent can rename or delete any node, then Save
// commits the trimmed draft via /api/ai/commit-syllabus.
// ============================================================
'use client';
import { useState } from 'react';
import { Trash2, ChevronDown, ChevronRight, Save, X, ListTree, Loader2 } from 'lucide-react';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Draft = any;

export function SyllabusReviewPanel({
  draft: initialDraft, onSave, onDiscard, saving,
}: {
  draft: Draft;
  onSave: (draft: Draft) => void;
  onDiscard: () => void;
  saving: boolean;
}) {
  const [draft, setDraft] = useState<Draft>(() => structuredClone(initialDraft));
  const [openTopics, setOpenTopics] = useState<Set<number>>(new Set([0]));

  const topics: any[] = draft.topics ?? [];
  const skillCount = topics.reduce((n, t) => n + (t.skills?.length ?? 0), 0);
  const taskCount = topics.reduce((n, t) => n + (t.skills ?? []).reduce((m: number, s: any) => m + (s.tasks?.length ?? 0), 0), 0);

  function update(mutator: (d: Draft) => void) {
    setDraft((prev: Draft) => {
      const next = structuredClone(prev);
      mutator(next);
      return next;
    });
  }
  const removeTopic = (ti: number) => update((d) => { d.topics.splice(ti, 1); });
  const removeSkill = (ti: number, si: number) => update((d) => { d.topics[ti].skills.splice(si, 1); });
  const removeTask = (ti: number, si: number, ki: number) => update((d) => { d.topics[ti].skills[si].tasks.splice(ki, 1); });
  const setSubjectName = (v: string) => update((d) => { d.subject.name = v; });
  const setTopicTitle = (ti: number, v: string) => update((d) => { d.topics[ti].title = v; });
  const setSkillName = (ti: number, si: number, v: string) => update((d) => { d.topics[ti].skills[si].name = v; });

  function toggleTopic(ti: number) {
    setOpenTopics((prev) => {
      const next = new Set(prev);
      if (next.has(ti)) next.delete(ti); else next.add(ti);
      return next;
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <ListTree className="w-6 h-6 text-violet-600" /> Review your curriculum
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Rename or remove anything before saving. {topics.length} topics · {skillCount} skills · {taskCount} tasks.
          </p>
        </div>
      </div>

      {/* Subject */}
      <div className="bg-violet-50 border border-violet-100 rounded-xl p-4">
        <label className="text-[11px] font-bold uppercase tracking-wider text-violet-700">Subject</label>
        <input
          value={draft.subject?.name ?? ''}
          onChange={(e) => setSubjectName(e.target.value)}
          className="mt-1 w-full bg-transparent text-lg font-bold text-gray-900 outline-none border-b border-transparent focus:border-violet-300"
        />
        {draft.subject?.description && <p className="text-xs text-violet-700 mt-1">{draft.subject.description}</p>}
      </div>

      {/* Topics */}
      <div className="space-y-3">
        {topics.map((topic, ti) => {
          const open = openTopics.has(ti);
          const skills: any[] = topic.skills ?? [];
          return (
            <div key={ti} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="flex items-center gap-2 p-3 bg-gray-50">
                <button onClick={() => toggleTopic(ti)} className="text-gray-400 hover:text-gray-700">
                  {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                </button>
                <input
                  value={topic.title ?? ''}
                  onChange={(e) => setTopicTitle(ti, e.target.value)}
                  className="flex-1 bg-transparent text-sm font-bold text-gray-900 outline-none"
                />
                <span className="text-[10px] font-semibold text-gray-400">{skills.length} skills</span>
                <button onClick={() => removeTopic(ti)} className="text-gray-300 hover:text-rose-500 p-1" title="Remove topic">
                  <Trash2 size={16} />
                </button>
              </div>

              {open && (
                <div className="p-3 space-y-2">
                  {skills.length === 0 && <p className="text-xs text-gray-400 italic px-1">No skills.</p>}
                  {skills.map((skill, si) => (
                    <div key={si} className="border border-gray-100 rounded-lg p-2.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">L{skill.level ?? 1}</span>
                        <input
                          value={skill.name ?? ''}
                          onChange={(e) => setSkillName(ti, si, e.target.value)}
                          className="flex-1 bg-transparent text-sm font-semibold text-gray-800 outline-none"
                        />
                        <button onClick={() => removeSkill(ti, si)} className="text-gray-300 hover:text-rose-500 p-1" title="Remove skill">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      {Array.isArray(skill.prerequisites) && skill.prerequisites.length > 0 && (
                        <p className="text-[11px] text-gray-400 mt-1 ml-8">Requires: {skill.prerequisites.join(', ')}</p>
                      )}
                      {Array.isArray(skill.tasks) && skill.tasks.length > 0 && (
                        <ul className="mt-2 ml-8 space-y-1">
                          {skill.tasks.map((task: any, ki: number) => (
                            <li key={ki} className="flex items-center gap-2 text-xs text-gray-600">
                              <span className="text-violet-300">•</span>
                              <span className="flex-1 truncate">{task.title}</span>
                              <button onClick={() => removeTask(ti, si, ki)} className="text-gray-300 hover:text-rose-500" title="Remove task">
                                <X size={12} />
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        <button
          onClick={onDiscard}
          disabled={saving}
          className="px-5 py-3 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-50 disabled:opacity-50"
        >
          Discard
        </button>
        <button
          onClick={() => onSave(draft)}
          disabled={saving || topics.length === 0}
          className="flex-1 py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-bold rounded-xl shadow-md hover:from-violet-700 hover:to-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          {saving ? 'Saving…' : 'Save curriculum'}
        </button>
      </div>
    </div>
  );
}
