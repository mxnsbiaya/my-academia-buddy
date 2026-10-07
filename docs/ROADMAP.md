# Product Roadmap & Backend Migration Strategy

This document outlines the evolutionary milestones for **My Academia Buddy**, including the completed v2.0 release and the proposed architectural migration to a cloud-backed architecture in v3.0.

---

## 1. Release Milestones

### ✅ Version 2.0 (Current Production Release)
- Complete UI/UX redesign into a modern productivity SaaS interface.
- Decoupled, pure heuristic scheduling engine with constraint satisfaction and fairness rules.
- Course difficulty tiers, explicit workload estimations, and priority weights.
- Preservation of completed sessions across plan recalculations.
- Interactive explainability accordions ("Why was this scheduled?").
- Impossible schedule detection and workload deficit warnings.
- Versioned storage persistence with schema migrations (v1 → v2) and JSON backup/restore.
- Full automated test suite (Vitest + React Testing Library) with 27 unit & integration tests.
- Accessible form controls, WCAG AA compliance, and mobile responsive drawer navigation.

### ⏳ Version 2.1 (Short-Term Enhancements)
- **iCalendar (.ics) Export:** Export generated study sessions directly into Google Calendar, Apple Calendar, or Outlook.
- **Active Study Session Mode:** Built-in Pomodoro timer for individual study blocks with audio completion chimes.
- **Dark / Light Theme Toggle:** Customizable color schemes for daytime study.

---

## 2. Version 3.0: Cloud Architecture & Supabase Strategy

### 2.1 Motivation & Requirements
While local browser storage ensures privacy and simplicity, students benefit greatly from:
- Multi-device synchronization (e.g. managing assignments on laptop, checking study schedule on mobile).
- Secure authentication (Google OAuth, student email login).
- Automated cloud backups without requiring manual JSON file exports.

### 2.2 Proposed Technology Stack
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth (JWT, Row Level Security)
- **Data Access:** Supabase JavaScript Client (`@supabase/supabase-js`)
- **Offline Sync:** Local-first caching layer (TanStack Query / IndexedDB) with cloud reconciliation.

### 2.3 Proposed Relational Database Schema

```sql
-- 1. Profiles Table (tied to Supabase Auth UUID)
create table public.profiles (
  id uuid references auth.users not null primary key,
  display_name text,
  university text,
  created_at timestamptz default now()
);

-- 2. Courses Table
create table public.courses (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  instructor text,
  schedule text,
  credits text default '3.0',
  difficulty text check (difficulty in ('Low', 'Medium', 'High')) default 'Medium',
  color text default '#3b82f6',
  created_at timestamptz default now()
);

-- 3. Assignments Table
create table public.assignments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  due_date date not null,
  priority text check (priority in ('Low', 'Medium', 'High')) default 'Medium',
  estimated_workload numeric(4, 1) default 3.0,
  completed boolean default false,
  created_at timestamptz default now()
);

-- 4. Exams Table
create table public.exams (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  course_id uuid references public.courses(id) on delete set null,
  title text not null,
  exam_date date not null,
  location text,
  notes text,
  priority text check (priority in ('Low', 'Medium', 'High')) default 'High',
  estimated_workload numeric(4, 1) default 6.0,
  created_at timestamptz default now()
);

-- 5. Weekly Availability Table
create table public.availability_slots (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  day text not null,
  start_time text not null,
  end_time text not null
);

-- 6. Generated Study Plan Table
create table public.study_sessions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  task_id text,
  session_date date not null,
  start_time text not null,
  end_time text not null,
  type text not null,
  title text not null,
  course text,
  completed boolean default false,
  recommendation text,
  explanation jsonb
);
```

### 2.4 Row Level Security (RLS) Policies
Every table enforces user-level isolation:
```sql
alter table public.courses enable row level security;

create policy "Users can only access their own courses"
  on public.courses for all
  using (auth.uid() = user_id);
```

### 2.5 Migration Plan from LocalStorage to Cloud
1. **Zero-Friction Guest Mode:** Continue supporting offline local storage for users without an account.
2. **Onboarding Cloud Sync Prompt:** Upon registering or logging in, detect existing localStorage data.
3. **One-Click Cloud Ingestion:** Automatically upsert existing courses, assignments, and exams into the user's Supabase account.
4. **Offline Resilience:** If connection is lost, mutations queue locally and sync once network connectivity restores.
