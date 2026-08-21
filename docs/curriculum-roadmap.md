# Curriculum Generation — Analysis & Roadmap

> Planning doc for evolving the curriculum/syllabus generation into a **whole-child (360°)
> development platform** with **step-by-step progress management for parents**.
> Grounded in the current implementation so it's buildable, not greenfield.

---

## Part A — How it works today

**Parent flow** (`src/views/new/SyllabusGeneratorPage.tsx`): paste source text → set age, skill
level, target grade, topic/task counts → stream generation.

**Backend** (`app/api/ai/generate-syllabus/route.ts`):
1. **Director agent** extracts **one subject** + N topics (objectives, Bloom level, difficulty,
   keywords, est. hours).
2. Topics chunked → **SME agents run in parallel**, each writing tasks (instructions, parent
   guide, materials, assessment criteria, resources) + 2–4 activities per task.
3. `server/ai/aiDb.ts` does embedding-based **find-or-create + smart merge**, enrolls the child,
   seeds `task_progress`.
4. SSE streams `planning → chunking → writing → complete`.

**Strengths:** genuine multi-agent decomposition, semantic de-dup, rich task metadata, streaming UX.

**Gaps that block "360° + easy management":**

| Gap | Impact |
|---|---|
| Single subject, purely academic | Builds *a subject*, not a *whole-child plan*. No social-emotional, physical, creative, life-skills, or character dimensions. |
| Not personalized to the child | `childId = kids[0]` (always the first child); ignores existing mastery, interests, learning style. |
| Source-only input | File/camera/PDF/URL are **stubbed**. No goal-first or interest-first generation. |
| No sequencing / roadmap | `prerequisites` column exists but unused; output is a flat list, not a *journey* with milestones/pacing. |
| Writes straight to DB | No preview/edit step — parents can't review before it commits. |
| Progress = per-task stage | No "you are here / next step / milestone" view. Hard to manage *step by step*. |
| `target_grade` is free text | No real standards alignment or coverage/gap analysis. |

---

## Part B — Cool & futuristic features

**🎯 Smarter generation inputs**
- **Goal-first backward planning:** "I want my 8-yo confident in multiplication by June" → AI
  generates a timeline with milestones.
- **Interest-driven interdisciplinary units:** child loves dinosaurs → math, reading, science
  woven around dinosaurs.
- **Multimodal ingestion:** snap a textbook page / upload a PDF (`pdf-parse` already a dep) / drop
  a YouTube URL → curriculum. Gemini is multimodal — this is close.

**🧠 Adaptive & living curriculum**
- **Mastery-based progression + spaced repetition** using `task_progress.mastery_score` /
  `next_due_at` (already captured): struggling → auto-remediation; excelling → enrichment.
- **Self-evolving plan:** the curriculum re-plans weekly from progress (ties into the adaptive planner).

**🌱 Whole-child (core of "360°")**
- Generate across **7 development domains**, not just academics:
  **Academic · Social-Emotional (SEL) · Physical/Motor · Creative/Arts · Life Skills ·
  Character/Values · Digital Literacy.** This single idea turns "syllabus generator" into
  "360° development."

**🎨 Rich content types**
- Auto printable **worksheets & quizzes** (feed the submission/grading loop), **hands-on
  projects**, **field-trip ideas**, **story-based lessons**, **educational games**, **video playlists**.
- **Visual/audio:** AI illustrations (Imagen), **read-aloud TTS** for young kids, diagrams.

**👪 Parent experience**
- **Portfolio auto-compile:** turn `submissions` into a timeline/showcase of the child's work.
- **Predictive insights:** "at this pace, mastery of X by ~date Y"; a **skill-gap radar** across domains.
- **Sibling/family mode:** one unit both kids do at their own levels.

---

## Part C — Improvement plan (phased) → 360° + step-by-step management

The unlock is a small model change: **group subjects under development domains**, then build a
**roadmap UI** on top.

### Phase 1 — Foundations & personalization *(quick wins)*
- Add `development_domain` (enum, the 7 domains) to `subjects` — one small migration; instantly
  enables a whole-child view.
- **Fix child targeting:** let the parent pick the child; feed the child's age/level/**interests/
  learning_style** into generation (add those columns to `children`). Personalization jumps immediately.
- **Review-before-save:** preview the generated tree, edit/trim, *then* commit. Builds trust.
- Replace free-text `target_grade` with a structured **standards framework** (e.g. CBSE/ICSE given
  the `en-IN` locale, or Common Core).

### Phase 2 — 360° generation
- New **"Whole-Child Plan"** mode: the Director agent proposes a **balanced set across all 7
  domains** for the child's age, as a **term roadmap with milestones** (extend `lesson_plans` to a
  term-level plan). Headline feature.
- Add goal-first and interest-first generation modes.

### Phase 3 — Step-by-step management (the parent's daily driver)
- **Learning Roadmap UI** per child: Domains → Milestones → Topics → Tasks, with progress rings and
  a clear **"you are here / next step / up next."**
- **Adaptive nightly engine:** reads mastery → adjusts difficulty, schedules spaced reviews,
  surfaces remediation/enrichment (the `scheduled_sessions` table is ready).
- **Milestones & celebrations** + an **AI weekly digest** ("mastered X, needs Y, here's next
  week") — the evening/weekly crons already send mail; add the narrative + a roadmap link.

### Phase 4 — Rich & multimodal content
- PDF/photo/URL ingestion; auto worksheets/quizzes (→ the grading loop already shipped); Imagen
  illustrations; TTS read-aloud; portfolio compilation.

### Phase 5 — Compliance & insight
- Standards coverage + **gap analysis**, exportable **compliance/attendance reports** (the
  `learning_sessions`/attendance table), predictive mastery ETAs, skill radar.

---

## Where to start (highest leverage, lowest effort)
1. **`development_domain` on subjects** + a domain-grouped view — smallest change that makes it "360°."
2. **Child-targeted, personalized generation** (pick the child; use real age/interests/mastery) —
   fixes the biggest quality gap.
3. **Review-before-save** in the generator.

These three reframe it from "a syllabus tool" into "a whole-child development platform," and set up
the Roadmap UI (Phase 3) that makes progress genuinely step-by-step for parents.

---

## Assets already in place (reuse, don't rebuild)
- Multi-agent generation (Director/SME) + embedding-based de-dup (`server/ai/aiDb.ts`)
- Rich mastery signals: `task_progress` (`learning_stage`, `mastery_score`, `interest_level`,
  `next_due_at`, `session_count`, `time_spent_minutes`, `parent_rating`)
- Scheduling: `lesson_plans` + `scheduled_sessions` (+ weekly-planner cron persistence)
- Assessment loop: `submissions` + `assessment_results` + `/api/ai/grade-submission`
- AI gateway (rate limit + retries + usage/cost logging) and the shared tool registry / MCP server
- Chat tutor with function-calling tools (`server/ai/tools`)
