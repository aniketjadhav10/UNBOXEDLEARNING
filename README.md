# UnBoxed Learning

A homeschool curriculum and progress-management app. Parents (admins) build multi-child curricula (child → subject → topic → task), track per-child learning progress, generate content with AI, and receive scheduled email/push reports. Students get their own read-only/practice-focused view. Installable as a PWA with offline support.

> This README replaces an older, stale version written for a pre-migration Vite/React SPA. The stack and structure below reflect the current Next.js app.

## Tech stack

- **Next.js 15** (App Router) · React 18 · TypeScript
- **Supabase** — Postgres, Auth, Row Level Security, RPCs, `pgvector` embeddings
- **Google Gemini** (`@google/genai`) for AI generation, chat, and agent tool-calling
- **Zustand** · **Tailwind CSS** · **framer-motion** · **lucide-react**
- **IndexedDB** (`idb`) for offline caching and an offline mutation queue
- **Web Push (VAPID)** for push notifications, a custom service worker for installability/offline
- Deploys to **Vercel** (cron jobs + serverless functions)

## Local development

```bash
npm install
cp .env.example .env.local   # fill in your Supabase/Gemini/SMTP/VAPID values
npm run dev                  # http://localhost:3000
```

Apply the SQL files in `supabase/` (in the Supabase SQL editor) to set up the schema, RLS policies, and RPCs.

Other scripts: `npm run build`, `npm test`, `npm run typecheck`, `npm run lint`.

## Documentation

- **[User Manual](#user-manual)** below — what every feature does and how to use the app.
- `CLAUDE.md` — architecture, coding conventions, and security rules for contributors.

---

# User Manual

## 1. Getting started (account lifecycle)

1. **Register** at `/register` with email + password (or Google). Password sign-ups are auto-approved; new accounts otherwise wait for approval.
2. **Pending Approval** — if not yet approved, you land on a holding page until a super-admin approves you (via **User Approvals**, super-admin only).
3. **Onboarding wizard** (first login only) — 5 steps: **Welcome → Create/Join Family → Add a Child → Invite a Co-Parent (optional) → Done**. You can skip the co-parent step. This creates your family, your first child profile, and marks your account onboarded.
4. After that you land on the **Dashboard** every time you log in.
5. **Forgot your password?** — `/forgot-password` sends a reset email → `/reset-password` sets a new one.

There are two account types:
- **Admin (parent)** — full management access, described in section 2.
- **Student (child)** — a separate login with a practice-focused view, described in section 3. A parent creates a child's login via Family/Kids management, not via self-registration.

## 2. Parent (Admin) features

### Dashboard (`/`)
Your daily command center — no need to check every page:
- Greeting + which child is currently selected.
- **Needs Attention Today** — overdue/due-today tasks, with a one-click "Mark practiced" button.
- **Curriculum Gaps** — flags subjects with no topics/tasks yet.
- Progress stats (Due Today, Overdue, Mastered, This Week, Avg Interest, Consistency), per-subject progress bars, and a Recent Tasks list.

### Curriculum → **Curriculum Builder** (`/subjects`)
This merges the old separate Subjects/Library/Topics/Tasks pages into one screen:
- Left rail: your subjects (tap to expand → topics). "Browse Library" tab lets you enroll in shared/global subjects instead of building from scratch.
- Main panel has two views: **Tree** (Subjects → Topics → Tasks, click through to drill in) and **Task list** (flat list with All/Today/Overdue/Mastered/Scheduled/Archived tabs, search, sort, filters).
- **Build with AI** button — describe a subject in plain text, AI drafts topics/tasks, you review and edit before saving (nothing is written until you confirm).
- On mobile, the rail and content collapse into a single full-width panel with a back button (won't show two panels side-by-side on a phone).
- Per-task actions: mark **Practiced** (disabled until a task is past "Not Started"), **Schedule for this week**, **Archive**, and **Details** (opens the editor — see below).

### Curriculum → **Learning Roadmap** (`/roadmap`)
A skill-tree view per child: Completed / Current / Next / Locked skills, with recommended-next suggestions and mastery-timeline estimates. This is rule-based (prerequisite graph), not AI-generated text.

### Curriculum → **360° Development** (`/development`)
Groups all subjects by one of 7 whole-child development domains (not just academics) so you can see at a glance which areas of development are covered vs. empty.

### Planning → **Planner** (`/planner`)
Your weekly schedule, Monday–Friday:
- **"Preview with AI"** — shows a proposed week (which skills, which day, plus a short reason for each) without saving anything.
- **"Generate/Regenerate this week's plan"** — actually builds and saves the week. An AI agent arranges it by urgency/interest/subject balance when it can; if AI is unavailable it silently falls back to a simpler rules-based spread — you always get a plan either way.
- Mark each day's item completed/skipped/reset.

### Planning → **Scheduled** / **Archived** (`/scheduled`, `/archived`)
Filtered task-list views — everything currently scheduled this week, and everything you've archived.

### Planning → **Reports** (`/reports`)
Charts: learning-stage distribution, subject mastery, subject engagement, weekly workload, interest-vs-difficulty, and a bottlenecks table (tasks stuck a long time).

### Administration → **Family** (`/family`)
- Create or join a family (by invite code).
- Invite a co-parent by email → they get a join code → they join with it.
- See all family members and their role; remove a member or leave the family.
- Add a child here too (name, grade, DOB).

### Administration → **Kids** (`/kids`, only shown once you have 2+ children)
Manage each child's profile — including **Interests** and **Learning Style**, which feed into AI curriculum generation so content gets personalized to that child.

### Administration → **Global Templates** / **Build 3–6 Library** (`/admin/templates`, `/admin/library-builder`)
Shared curriculum content usable across families: browse/promote community templates, or one-click batch-generate a full 3–6-year-old curriculum library.

### Administration → **AI Syllabus** (`/syllabus-generator`)
Standalone version of "Build with AI" for building a whole new subject from a prompt (or an uploaded PDF/photo), with the same review-before-save step.

### Administration → **System Logs** / **AI Usage** (`/system/emails`, `/system/ai-usage`)
- System Logs: history of every automated email sent (success/failure).
- AI Usage: how many AI calls, tokens, and errors — broken down per feature (chat, syllabus generation, weekly planner, stage suggestions, report narration, etc).

### Administration → **Settings** (`/settings`)
- Profile name, password change.
- AI Memories (facts the chat assistant has learned about your family — manage/delete), Clear Chat History.
- **Notifications**: Push Notifications (real device push — see §4), Email Digests, Achievement Alerts.
- **Install App** row (only shows once your browser signals it's installable — see §5).
- Dark Mode, Accent Color, Language.

### The AI Chat Assistant
A floating chat bubble (bottom-right on most pages, full page at `/chat`). It's not just Q&A — it can actually look things up and make changes for you:
- Search your curriculum by meaning ("find anything about fractions").
- Tell you what's due/overdue.
- Remember a fact you tell it ("remember that Shlok prefers hands-on activities").
- **Mark a task's stage for you** if you ask in plain language ("mark the counting task as practicing for Shlok").
- It can chain a couple of these lookups/actions together in one turn before answering, instead of only doing one step at a time.

### On-demand AI task suggestions
Open any task's **Details** dialog → a small "Get AI suggestion" button proposes whether to advance the stage, hold steady, flag it as needing more practice, or adjust the repeat interval — with a one-line reason. It's advisory only: click "Apply to form" to pre-fill the fields, then you still hit **Save** yourself. Nothing changes automatically.

## 3. Student (child) features

Students sign in with their own account (created by the parent) and see a simpler nav: **Dashboard, My Learning, Subjects, Progress, Profile**. They cannot reach admin pages (Planner, Settings, Family, etc. — the app redirects them home if they try).
- **My Learning** — subjects in progress + "up next" topics, tap to open.
- **Subjects** — browse the enrolled curriculum.
- **Progress** — overall completion %, per-subject bars, and milestone badges (First Topic Done, 10 Topics Completed, etc).
- **Profile** — their own info.

## 4. Notifications you'll receive

All are best-effort — if AI narration is unavailable they still send with plain factual copy, they just won't get the extra written summary.

| When (server time) | What | Where |
|---|---|---|
| 8:00 AM daily | "Today's Agenda" — today's scheduled activities | Email + push notification |
| 5:00 PM daily | Evening progress summary — what was mastered today / still pending | Email |
| 7:00 AM every Monday | New weekly plan ready | Email |
| 6:00 PM every Sunday | Weekly progress report — practiced/mastered counts per child | Email |
| 2:00 AM daily (silent) | Spaced-repetition review sweep — resurfaces skills due for review | No notification, just updates the roadmap |

Times are server-scheduled (UTC-based), so they may land at a different local hour than you'd expect depending on your timezone.

## 5. Install it as an app / offline use

- A banner or Settings → **Install App** lets you add it to your home screen like a native app.
- Once installed, it keeps working with spotty connectivity: pages you've already visited stay available offline, and marking a task "Practiced" while offline is queued and synced automatically the moment you're back online (a "saved offline" toast, then a "synced" toast later).
- When a new version is deployed, a small banner appears ("A new version is ready") — tap Refresh whenever you want to update; it won't force-reload you mid-task.

## Quick tips / things that trip people up

- **"Practiced" button is greyed out** — a task must be past "Not Started" before you can mark it practiced. There's currently no in-app button to move it out of "Not Started" from the task card itself.
- **Kids nav item missing** — it only appears once you have 2+ children; with one child it's hidden since there's nothing to switch between.
- **Push notification toggle does nothing visible** — it silently asks your browser for permission; if you've previously denied notifications for this site, you'll need to re-enable them in your browser's site settings before the toggle can turn on.
- **AI features degrade gracefully** — if any AI call fails (rate limit, outage), the app always falls back to a working non-AI version rather than breaking (weekly plan still generates, reports still send).
