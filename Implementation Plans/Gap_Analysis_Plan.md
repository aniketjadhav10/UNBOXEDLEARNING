# UnBoxed Learning — Full System Gap Analysis

I've analyzed every page, route, service, database schema, and AI feature in your app. Here is a complete and honest assessment of what's working well and what major functionality is **missing or incomplete** that would stop this from being a truly productive homeschool tool.

---

## ✅ What You Already Have (Working Well)
- Family workspace with invitations & roles (owner/parent)
- Subject → Topic → Task → Activity hierarchy
- Task progress tracking (stages, ratings, sessions)
- AI Syllabus Generator & Global Library
- Chatbot with vector memory, tool calling
- Analytics & Reports dashboard
- This Week scheduled view
- Lesson page with session logging
- Onboarding wizard

---

## 🔴 Critical Missing Features (Core Productivity Gaps)

These are things a homeschool parent would need **every single day** and would find the app unusable without.

---

### 1. 📅 No Real Calendar / Schedule System

**What's missing:** Tasks have a `next_due_at` field but there is **no calendar UI**. Parents cannot plan "I want to do Math on Mondays" or see a weekly/monthly visual of what is scheduled.

**Impact:** This is the #1 feature homeschool parents need. Without a visual calendar, the app is just a task list.

**What to build:**
- A **Weekly Calendar View** (Mon–Fri grid) where parents can drag tasks into time slots
- A `schedule_slots` table: `(task_id, day_of_week, time_slot)`
- Auto-scheduling: AI suggests a weekly timetable based on tasks and child's bandwidth

---

### 2. 📝 No Session Notes / Learning Journal

**What's missing:** The `LessonPage` saves a rating, time spent, and a one-line note. There is no **dedicated journal or session history view** for parents to review past sessions.

**Impact:** Homeschool parents in many regions must keep **portfolio records** for legal compliance. Without a journal, they cannot track "what did we actually do on March 5th?"

**What to build:**
- A **Session History / Learning Journal** page per child
- Rich session notes with tags (e.g., #breakthrough, #struggled)
- Ability to export session history as a formatted PDF

---

### 3. 📤 No Export / Portfolio Generation

**What's missing:** There is no way to export any data. No PDF reports, no printable schedules, no portfolio documents.

**Impact:** Homeschool portfolios are required by law in many states/countries. This is a **deal-breaker** for many parents.

**What to build:**
- PDF export of: Session history, Progress report per child, Weekly schedule
- AI-generated portfolio narrative (connects to the AI roadmap item 3.1)

---

### 4. 🔔 No Notification System

**What's missing:** No push notifications, email reminders, or in-app alerts beyond toast messages. The `next_due_at` field exists but nothing reminds anyone when tasks are due.

**Impact:** Parents will forget to open the app. Without reminders, overdue tasks pile up silently.

**What to build:**
- In-app notification bell (already has Bell icon in Settings but unused)
- Email digest: "Here's Yug's schedule for this week"
- Browser push notifications for overdue tasks (using Web Push API + Supabase Edge Function)

---

### 5. 👧 Child's Self-View is Incomplete

**What's missing:** The `MyLearningPage`, `ProgressPage`, and `ProfilePage` are student-only routes, but when you look at them they are very basic — no gamification, no motivational elements, no way for a child to see "what's next for me today."

**Impact:** Homeschooled children need to be engaged participants, not just subjects being tracked. A dedicated child dashboard would massively increase their buy-in.

**What to build:**
- **Child Dashboard**: "My tasks for today", streak tracker, earned badges
- **Gamification**: Points, levels, achievement badges (beyond the static list in KidProfilePage)
- Age-appropriate UI mode for young children

---

### 6. 🧪 Quiz / Assessment System is Missing

**What's missing:** `activity_type` can be `quiz` but there is **no actual quiz engine**. The Activities page shows activities but cannot administer a quiz. A child can't actually *be tested*.

**Impact:** Without assessments, "learning stage" is purely subjective parent opinion. There's no data to validate if a child has actually learned something.

**What to build:**
- Quiz activity type with Q&A format (multiple choice, fill-in-the-blank)
- Auto-grading that updates `learning_stage` and `parent_rating` based on quiz score
- AI question generator: given a task description, generate 5 quiz questions

---

### 7. 📁 File Parsing for Syllabus Generator is a Placeholder

**What's missing:** In `SyllabusGeneratorPage.tsx`, both **File Upload** and **Camera** modes show "not fully implemented yet" toasts. These are visible to users as broken features.

**Impact:** First impressions matter. Broken UI buttons destroy trust.

**What to build:**
- PDF/image upload → extract text via Gemini Vision → feed into syllabus generator
- Camera capture on mobile

---

## 🟡 Important Missing Features (Significant Productivity Gaps)

These are features that would significantly improve the daily experience.

---

### 8. 🎯 No Goal Setting / Milestones System

The app has static milestone badges in `KidProfilePage` but no way for parents to set **actual educational goals** with deadlines — e.g., *"Yug should complete Grade 1 Math by December 2025."*

**What to build:** A `goals` table with target dates, linked to subjects/topics. Dashboard shows goal progress.

---

### 9. 🔗 No Resource Library

Activities have a `materials` field (text array) but there is no central **resource library**. Parents cannot save a YouTube video or worksheet link once and reuse it across multiple tasks.

**What to build:** A `resources` table. Parents save links/files once and attach them to multiple activities.

---

### 10. 🌐 Global Syllabus Library Lacks Discovery

The `SubjectLibraryPage` was recently improved, but there is still no way to **preview a subject** before enrolling — no topic list shown, no task count, no reviews/ratings from other families.

**What to build:** Subject detail page with full topic/task preview before enrollment. Star ratings and family count.

---

### 11. 👥 Multi-Child View is Awkward

Currently you select one child via `useSettingsStore().selectedChildId`. There is no **side-by-side comparison** or unified dashboard showing all children at once. Parents with 3 kids have to switch context repeatedly.

**What to build:** A "Family Overview" mode on the dashboard showing all children's progress cards simultaneously.

---

### 12. 🤝 Co-Teaching / Parent Collaboration

Two parents (e.g., mom and dad, or a tutor) are in the same family but there is no way to assign specific tasks or subjects to specific parents. There is no "assigned to" concept.

**What to build:** `task_assignments` table — which parent is responsible for teaching which subject/task.

---

## 🟢 Minor / Polish Gaps

| Gap | Details |
|---|---|
| **No dark mode for lesson pages** | Settings has a dark mode toggle but it may not apply to all pages |
| **No Offline Support** | `sync_queue` table exists but offline queue is not wired up to a service worker |
| **No App Store / PWA Install prompt** | Has a `manifest.webmanifest` but no "Install App" prompt shown to users |
| **Admin Approvals page under-used** | The `ApprovalsPage` exists but the flow works automatically now; consider removing confusion |
| **Email templates are hardcoded** | The `AdminTemplatesPage` exists but no actual dynamic template system is wired |

---

## Summary: Priority Order

| Priority | Feature | Daily Impact |
|---|---|---|
| 🔴 P0 | **Calendar / Schedule View** | Parents plan their week here |
| 🔴 P0 | **Session Journal + PDF Export** | Legal compliance, records |
| 🔴 P0 | **Notification System** | Reminders → consistent usage |
| 🔴 P0 | **Fix broken File/Camera buttons** | Trust / first impressions |
| 🟡 P1 | **Child Dashboard + Gamification** | Child engagement |
| 🟡 P1 | **Quiz / Assessment Engine** | Actual learning validation |
| 🟡 P1 | **Goal Setting with Deadlines** | Structured planning |
| 🟡 P1 | **Global Library: Subject Preview** | Better library UX |
| 🟢 P2 | Resource Library | Efficiency |
| 🟢 P2 | Multi-child unified view | Convenience |
| 🟢 P2 | Co-teaching assignments | Family collaboration |
