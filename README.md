# Homeschool Management App

A production-minded starter for a homeschool planning app using React, Vite, TypeScript, Vercel Functions, Supabase, Zustand, Tailwind CSS, and IndexedDB.

## Features

- Supabase email/password auth wiring
- Multi-child curriculum model: child, subject, topic, task
- Task progress tracking
- AI lesson generation through a backend-only OpenAI call
- AI content inbox
- Offline task cache and sync queue with IndexedDB
- Vercel-ready `/api` serverless functions

## Folder Structure

```text
api/
  _utils/
  ai/
  tasks/
  sync/
src/
  components/
  hooks/
  offline/
  pages/
  services/
  store/
  utils/
supabase/
  schema.sql
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local`:

```bash
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_URL=your-supabase-url
SUPABASE_ANON_KEY=your-supabase-anon-key
OPENAI_API_KEY=your-openai-api-key
```

3. Run `supabase/schema.sql` in the Supabase SQL editor.

4. Start development:

```bash
npm run dev
```

For Vercel, add the same environment variables in Project Settings. The OpenAI key is only read inside `/api/ai/generateLesson.ts`, so it is never exposed to the browser.

## Notes

The starter includes in-memory sample curriculum so the dashboard is useful immediately. Once Supabase rows exist for a signed-in user, connect list queries in the store or add loader hooks for children, subjects, topics, and tasks.
