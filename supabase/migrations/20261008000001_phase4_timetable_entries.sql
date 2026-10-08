-- ==============================================================================
-- My Academia Buddy — Phase 4: Timetable Entries Schema & Security
-- Migration: 20261008000001_phase4_timetable_entries.sql
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  course_code TEXT NOT NULL,
  course_name TEXT NOT NULL,
  section TEXT DEFAULT '',
  activity_type TEXT DEFAULT 'lecture',
  day_of_week TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  location TEXT DEFAULT '',
  instructor TEXT DEFAULT '',
  term TEXT DEFAULT 'Fall 2026',
  color TEXT DEFAULT '#3b82f6',
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT timetable_entries_user_client_unique UNIQUE (user_id, client_id)
);

-- Trigger for automatic updated_at
CREATE OR REPLACE TRIGGER trg_timetable_entries_updated_at
  BEFORE UPDATE ON public.timetable_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "timetable_entries_select_own" ON public.timetable_entries
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "timetable_entries_insert_own" ON public.timetable_entries
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "timetable_entries_update_own" ON public.timetable_entries
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "timetable_entries_delete_own" ON public.timetable_entries
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
