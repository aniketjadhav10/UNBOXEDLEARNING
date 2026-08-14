# AI Advancement Roadmap — UnBoxed Learning

## Current AI Stack (What You Have Today)

Your app already has a strong foundation:
- **Chatbot** with Tool Use (save memory, search tasks, update stage)
- **Vector Memory** – long-term user facts stored as embeddings in `user_memories`
- **Semantic Task Search** – `match_tasks` and `match_user_memories` RPC
- **Syllabus Generator** – AI creates structured Subject → Topic → Task trees
- **Global Syllabus Library** – community sharing of AI-generated curricula

---

## Proposed AI Feature Roadmap

### 🚀 Phase 1 — Smart Curriculum Co-Pilot (High Impact, Low Effort)

These extend your *existing* chatbot with more powerful tools so parents can have a natural language conversation to manage the entire curriculum.

#### 1.1 — Chatbot Tool: `create_task` / `create_topic`
Right now the chat can only *read* and *update* tasks. Add tools so a parent can say **"Add a task called Letter Formation to Writing basics for Yug"** and the AI will create it directly.

**New Tools:** `create_task`, `create_topic`, `assign_task_to_child`

#### 1.2 — Chatbot Tool: `generate_weekly_plan`
The parent asks **"Plan this week for Yug"** and the AI analyzes overdue/in-progress tasks, the child's age/learning stage, and outputs a structured 5-day weekly schedule — which it then saves to the DB.

#### 1.3 — Inline AI Suggestions on Task Cards
On the Task Management page, add a **"✨ AI Improve"** button next to each task. When clicked, AI suggests better descriptions, adds relevant activities (video links, worksheet ideas), and recommends a difficulty adjustment.

---

### 🧠 Phase 2 — Adaptive Learning Engine (Medium Effort)

This is where you move from static curriculum to a **self-adjusting system** that learns from the child's real performance.

#### 2.1 — Spaced Repetition & AI-Scheduled Review
Currently `next_due_at` is set manually. Build an AI scheduler that:
- Uses `parent_rating`, `session_count`, and `learning_stage` to compute the *next optimal review date*
- Automatically updates `next_due_at` after each session using the SM-2 algorithm (used by Anki)
- The chatbot can explain **"Why is this task scheduled for Thursday?"**

#### 2.2 — Learning Style Detection
After 3–5 sessions on a child, AI silently analyzes their progress patterns and saves to `user_memories`:
- *"Yug learns better with hands-on activities than reading"*
- *"Morning sessions have higher parent ratings than evening ones"*

These memories then influence how the **Syllabus Generator** picks `activity_type` for future tasks.

#### 2.3 — Difficulty Auto-Adjustment
If `parent_rating` consistently falls below 3 for a topic, the AI flags it as **"Needs Simplification"** and suggests breaking the topic into smaller sub-tasks automatically.

---

### 📊 Phase 3 — AI-Powered Insights & Reports (Medium Effort)

Transform your already-good `ReportsPage` into a proactive insights engine.

#### 3.1 — AI Narrative Report Generation
Add a **"Generate AI Report"** button on the Reports page. The AI analyzes all progress data for a child and writes a **natural language narrative report** — suitable for portfolio documentation (important for homeschool record-keeping).

Example output:
> *"Yug has shown consistent improvement in Mathematics over the past 30 days, completing 8 out of 10 assigned tasks with an average rating of 4.2/5. The topic 'Addition with Carrying' required extra sessions but was ultimately mastered. It is recommended to introduce Subtraction next."*

#### 3.2 — Proactive AI Alerts
A background process (cron or Supabase scheduled function) that runs daily and:
- Detects tasks overdue for 3+ days → sends a push notification/toast
- Detects a streak of 5+ days → sends a "Great consistency!" celebration
- Detects a subject with 0 activity for 2+ weeks → flags it as "Neglected Subject"

#### 3.3 — Curriculum Gap Analysis
AI compares the child's current syllabus against the global curriculum library to detect gaps. It surfaces: **"Yug's Math curriculum has no Geometry topics. Here are 3 popular topic bundles to add."**

---

### 🌐 Phase 4 — Advanced AI Architecture (Advanced)

These are sophisticated AI engineering concepts that take the system to the next level.

#### 4.1 — RAG (Retrieval-Augmented Generation) for the Global Library
When a parent generates a new syllabus, instead of asking the AI from scratch every time, first **query the global syllabus library using vector similarity** to find the closest matching existing curricula. Then pass them as context to the AI. This ensures:
- Less hallucination
- Faster generation
- Outputs that are consistent with what already works for other families

**New Supabase function:** `match_global_syllabi(query_embedding, grade, age_group)`

#### 4.2 — AI Agent: Autonomous Daily Planner
Build a **multi-step AI agent** (using Gemini's function calling in a loop) that runs as a serverless function on a schedule. It:
1. Fetches each child's progress
2. Identifies what's overdue, what's mastered, what's next
3. Builds a weekly plan
4. Saves it back to the DB
5. Sends a summary to the parent via notification

This is a true **agentic loop** — the AI takes decisions and actions without human prompts.

#### 4.3 — Multi-Modal Activity Support
Allow parents to upload a **photo of a worksheet** or record a **voice note** after a session. Gemini Vision analyzes the worksheet and automatically updates the task's `parent_rating` and `notes`. Voice notes are transcribed and summarized.

---

## Implementation Priority

| Phase | Feature | Effort | Impact |
|---|---|---|---|
| 1 | Chat tools: `create_task`, `create_topic` | 🟢 Low | 🔥 High |
| 1 | Inline "AI Improve" on task cards | 🟢 Low | 🔥 High |
| 1 | `generate_weekly_plan` chat tool | 🟡 Medium | 🔥 High |
| 2 | Spaced Repetition Scheduler | 🟡 Medium | 🔥 High |
| 3 | AI Narrative Report | 🟢 Low | ⭐ Medium |
| 3 | Proactive AI Alerts | 🟡 Medium | ⭐ Medium |
| 2 | Learning Style Detection | 🟡 Medium | ⭐ Medium |
| 4 | RAG for Global Library | 🔴 High | 🔥 High |
| 4 | Autonomous Daily Planner Agent | 🔴 High | 🔥 High |
| 4 | Multi-Modal (Photo/Voice) | 🔴 High | ⭐ Medium |

---

## Open Questions

> [!IMPORTANT]
> Please review and tell me which phase/features you want to start with first so I can create a detailed implementation plan.

1. **Which feature excites you most?** Phase 1 (Chatbot tools), Phase 2 (Adaptive), Phase 3 (Reports), or Phase 4 (Advanced Agent)?
2. **For AI Reports (3.1):** Should these reports be exportable as PDF (for homeschool portfolio records)?
3. **For Proactive Alerts (3.2):** Do you have a notification system in place (email, push, in-app toast)?
4. **For the Autonomous Agent (4.2):** Are you open to using Supabase scheduled functions (pg_cron), or do you prefer a Vercel cron job?
