-- ==============================================================================
-- My Academia Buddy — Phase 3: Cloud Synchronization Schema & Security
-- Migration: 20261008000000_phase3_user_accounts_cloud_sync.sql
-- ==============================================================================

-- 1. Automatic Timestamp Function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Profiles Table (1:1 with auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT DEFAULT '',
  program TEXT DEFAULT 'Computer Science',
  semester TEXT DEFAULT 'Undergraduate',
  organization_level TEXT DEFAULT 'Building Habits',
  academic_goal TEXT DEFAULT 'Build consistent study habits and balance coursework without burnout',
  weekly_work_hours NUMERIC DEFAULT 10,
  work_schedule_summary TEXT DEFAULT '',
  weekly_study_goal_hours NUMERIC DEFAULT 18,
  preferred_language TEXT DEFAULT 'en',
  preferred_study_periods JSONB DEFAULT '["afternoon", "evening"]'::jsonb,
  recurring_commitments JSONB DEFAULT '[]'::jsonb,
  onboarding_completed BOOLEAN DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Courses Table
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  name TEXT NOT NULL,
  instructor TEXT DEFAULT '',
  schedule TEXT DEFAULT '',
  credits TEXT DEFAULT '3.0',
  difficulty TEXT DEFAULT 'Medium',
  color TEXT DEFAULT '#3b82f6',
  grading_scheme JSONB DEFAULT '[]'::jsonb,
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT courses_user_client_unique UNIQUE (user_id, client_id)
);

-- 4. Syllabus Topics Table (Scoped to Course & User via Composite Key)
CREATE TABLE IF NOT EXISTS public.syllabus_topics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  course_client_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  week_number INT DEFAULT 1,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  required_readings TEXT DEFAULT '',
  practice_problems TEXT DEFAULT '',
  estimated_hours NUMERIC DEFAULT 3.0,
  prerequisite_topic_ids JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'not_started',
  confidence INT DEFAULT 3,
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT syllabus_topics_user_client_unique UNIQUE (user_id, client_id),
  CONSTRAINT fk_syllabus_topics_course FOREIGN KEY (user_id, course_client_id)
    REFERENCES public.courses (user_id, client_id) ON DELETE CASCADE
);

-- 5. Assignments Table
CREATE TABLE IF NOT EXISTS public.assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  course TEXT NOT NULL,
  title TEXT NOT NULL,
  due_date TEXT DEFAULT '',
  priority TEXT DEFAULT 'Medium',
  estimated_workload NUMERIC DEFAULT 3,
  weight_percent NUMERIC,
  completed BOOLEAN DEFAULT false,
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT assignments_user_client_unique UNIQUE (user_id, client_id)
);

-- 6. Exams Table
CREATE TABLE IF NOT EXISTS public.exams (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  course TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT DEFAULT '',
  location TEXT DEFAULT '',
  notes TEXT DEFAULT '',
  priority TEXT DEFAULT 'High',
  estimated_workload NUMERIC DEFAULT 5,
  weight_percent NUMERIC,
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT exams_user_client_unique UNIQUE (user_id, client_id)
);

-- 7. Availability Slots Table
CREATE TABLE IF NOT EXISTS public.availability_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  day TEXT NOT NULL,
  start_time TEXT NOT NULL,
  end_time TEXT NOT NULL,
  warning TEXT DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT availability_user_client_unique UNIQUE (user_id, client_id)
);

-- 8. Weekly Check-Ins Table
CREATE TABLE IF NOT EXISTS public.check_ins (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  week_number INT NOT NULL,
  date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  responses JSONB NOT NULL DEFAULT '[]'::jsonb,
  new_commitments_noted TEXT DEFAULT '',
  completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT check_ins_user_client_unique UNIQUE (user_id, client_id)
);

-- 9. Adaptive Signals Table (1:1 with User)
CREATE TABLE IF NOT EXISTS public.adaptive_signals (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  completion_rate NUMERIC DEFAULT 100,
  pace_multiplier NUMERIC DEFAULT 1.0,
  missed_sessions_count INT DEFAULT 0,
  postponement_count INT DEFAULT 0,
  preferred_session_duration INT DEFAULT 60,
  observed_velocity_by_course JSONB DEFAULT '{}'::jsonb,
  last_recalibration_date TIMESTAMPTZ DEFAULT NOW(),
  coach_insight TEXT DEFAULT '',
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Study Sessions Table (Study Plan)
CREATE TABLE IF NOT EXISTS public.study_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id TEXT NOT NULL,
  day TEXT,
  date TEXT,
  time TEXT,
  start_time TEXT,
  end_time TEXT,
  duration NUMERIC,
  type TEXT,
  title TEXT,
  course TEXT,
  details TEXT,
  completed BOOLEAN DEFAULT false,
  micro_steps JSONB DEFAULT '[]'::jsonb,
  priority TEXT,
  topic_id TEXT,
  assignment_id TEXT,
  exam_id TEXT,
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT study_sessions_user_client_unique UNIQUE (user_id, client_id)
);

-- 11. Study Insights Table (1:1 with User)
CREATE TABLE IF NOT EXISTS public.study_insights (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  insights_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  version INT NOT NULL DEFAULT 1,
  client_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ==============================================================================
-- Triggers for Automatic updated_at
-- ==============================================================================
CREATE OR REPLACE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_courses_updated_at BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_syllabus_topics_updated_at BEFORE UPDATE ON public.syllabus_topics FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_assignments_updated_at BEFORE UPDATE ON public.assignments FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_exams_updated_at BEFORE UPDATE ON public.exams FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_availability_slots_updated_at BEFORE UPDATE ON public.availability_slots FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_check_ins_updated_at BEFORE UPDATE ON public.check_ins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_adaptive_signals_updated_at BEFORE UPDATE ON public.adaptive_signals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_study_sessions_updated_at BEFORE UPDATE ON public.study_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE OR REPLACE TRIGGER trg_study_insights_updated_at BEFORE UPDATE ON public.study_insights FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ==============================================================================
-- Enable Row Level Security (RLS) on All Tables
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.syllabus_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.availability_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.adaptive_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.study_insights ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- RLS Policies (Strict User Scoping)
-- ==============================================================================

-- Profiles: 1:1 with auth.users
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_delete_own" ON public.profiles FOR DELETE TO authenticated USING (auth.uid() = id);

-- Courses
CREATE POLICY "courses_select_own" ON public.courses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "courses_insert_own" ON public.courses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "courses_update_own" ON public.courses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "courses_delete_own" ON public.courses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Syllabus Topics
CREATE POLICY "topics_select_own" ON public.syllabus_topics FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "topics_insert_own" ON public.syllabus_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "topics_update_own" ON public.syllabus_topics FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "topics_delete_own" ON public.syllabus_topics FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Assignments
CREATE POLICY "assignments_select_own" ON public.assignments FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "assignments_insert_own" ON public.assignments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assignments_update_own" ON public.assignments FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "assignments_delete_own" ON public.assignments FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Exams
CREATE POLICY "exams_select_own" ON public.exams FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "exams_insert_own" ON public.exams FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exams_update_own" ON public.exams FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "exams_delete_own" ON public.exams FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Availability Slots
CREATE POLICY "availability_select_own" ON public.availability_slots FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "availability_insert_own" ON public.availability_slots FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "availability_update_own" ON public.availability_slots FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "availability_delete_own" ON public.availability_slots FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Check-Ins
CREATE POLICY "checkins_select_own" ON public.check_ins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "checkins_insert_own" ON public.check_ins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkins_update_own" ON public.check_ins FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "checkins_delete_own" ON public.check_ins FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Adaptive Signals
CREATE POLICY "signals_select_own" ON public.adaptive_signals FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "signals_insert_own" ON public.adaptive_signals FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "signals_update_own" ON public.adaptive_signals FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "signals_delete_own" ON public.adaptive_signals FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Study Sessions
CREATE POLICY "sessions_select_own" ON public.study_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "sessions_insert_own" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_update_own" ON public.study_sessions FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "sessions_delete_own" ON public.study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Study Insights
CREATE POLICY "insights_select_own" ON public.study_insights FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insights_insert_own" ON public.study_insights FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "insights_update_own" ON public.study_insights FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "insights_delete_own" ON public.study_insights FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Automatically create profile row when user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, program, semester)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'Computer Science',
    'Undergraduate'
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.adaptive_signals (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
