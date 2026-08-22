-- ============================================================================
-- Dashboard redesign — additive schema migration
-- ============================================================================
-- SAFE TO RUN ON THE LIVE DATABASE: every statement below either creates a
-- brand-new table or adds a nullable/defaulted column to an existing one.
-- Nothing here drops, renames, or alters any existing column, and nothing
-- touches existing rows in `profiles` or `bookings` — current parent
-- accounts, credits, bookings, and logins (Supabase Auth) are untouched.
--
-- Run this once, in full, via the Supabase SQL Editor (Dashboard > SQL Editor
-- > New query), the same way earlier migrations on this project were applied.
-- It is idempotent (safe to re-run) thanks to IF NOT EXISTS / OR REPLACE.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. profiles: per-student Zoom classroom + reminder preferences
-- ----------------------------------------------------------------------------
alter table public.profiles add column if not exists zoom_link text;
alter table public.profiles add column if not exists zoom_password text;
alter table public.profiles add column if not exists notify_lesson_enabled boolean not null default false;
alter table public.profiles add column if not exists notify_email text;
alter table public.profiles add column if not exists notify_homework_enabled boolean not null default false;

-- Manually controlled by Teacher Andrew in the Client Database (like credits) —
-- this, not payment history, decides who sees Lesson Notes / Homework /
-- Quiz-Exam Scores / Progress Analysis. Defaults false for every existing row.
alter table public.profiles add column if not exists is_committed_package boolean not null default false;

-- ----------------------------------------------------------------------------
-- 2. bookings: "What to Cover" prep note + explicit missed-lesson flag
-- ----------------------------------------------------------------------------
alter table public.bookings add column if not exists cover_note text;
alter table public.bookings add column if not exists missed boolean not null default false;

-- ----------------------------------------------------------------------------
-- 3. student_exams — multiple upcoming tests/exams per student (e.g. the 3
--    GCSE Geography papers), shown as the countdown on the booking portal.
-- ----------------------------------------------------------------------------
create table if not exists public.student_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null,
  exam_date date not null,
  created_at timestamptz not null default now()
);
create index if not exists student_exams_user_id_idx on public.student_exams(user_id);

-- ----------------------------------------------------------------------------
-- 4. lesson_notes — one PDF snapshot per completed lesson (Committed Package)
-- ----------------------------------------------------------------------------
create table if not exists public.lesson_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  lesson_number integer,
  topic text not null,
  pdf_url text,
  created_at timestamptz not null default now()
);
create index if not exists lesson_notes_user_id_idx on public.lesson_notes(user_id);

-- ----------------------------------------------------------------------------
-- 5. quiz_scores — short end-of-lesson quiz, one per lesson
-- ----------------------------------------------------------------------------
create table if not exists public.quiz_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  lesson_number integer,
  topic text,
  score integer not null,
  out_of integer not null default 10,
  created_at timestamptz not null default now()
);
create index if not exists quiz_scores_user_id_idx on public.quiz_scores(user_id);

-- ----------------------------------------------------------------------------
-- 6. mock_exams — real exam questions / a full mock paper, marked by Teacher
--    Andrew. Not tied to a specific lesson, and not every student gets one.
-- ----------------------------------------------------------------------------
create table if not exists public.mock_exams (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  info text,
  result text,
  exam_date date,
  file_url text,
  created_at timestamptz not null default now()
);
create index if not exists mock_exams_user_id_idx on public.mock_exams(user_id);

-- ----------------------------------------------------------------------------
-- 7. homework — optional per-lesson homework (Committed Package)
-- ----------------------------------------------------------------------------
create table if not exists public.homework (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  booking_id uuid references public.bookings(id) on delete set null,
  lesson_number integer,
  due_date date,
  instructions text,
  uploaded_file_url text,
  uploaded_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists homework_user_id_idx on public.homework(user_id);

-- ----------------------------------------------------------------------------
-- 8. Storage bucket for the PDFs (lesson notes, homework, marked mock papers).
--    Public-read is fine here since URLs are unguessable UUIDs and nothing
--    else in the app links to them except from an authenticated dashboard.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('dashboard-files', 'dashboard-files', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- 9. Row-Level Security — each student can only ever read their OWN rows.
--    All writes to these tables happen server-side via the Netlify functions
--    (service-role key), the same pattern already used for `bookings`, so no
--    INSERT/UPDATE/DELETE policy is needed for the authenticated role.
-- ----------------------------------------------------------------------------
alter table public.student_exams enable row level security;
alter table public.lesson_notes  enable row level security;
alter table public.quiz_scores   enable row level security;
alter table public.mock_exams    enable row level security;
alter table public.homework      enable row level security;

drop policy if exists "select_own_student_exams" on public.student_exams;
create policy "select_own_student_exams" on public.student_exams
  for select using (auth.uid() = user_id);

drop policy if exists "select_own_lesson_notes" on public.lesson_notes;
create policy "select_own_lesson_notes" on public.lesson_notes
  for select using (auth.uid() = user_id);

drop policy if exists "select_own_quiz_scores" on public.quiz_scores;
create policy "select_own_quiz_scores" on public.quiz_scores
  for select using (auth.uid() = user_id);

drop policy if exists "select_own_mock_exams" on public.mock_exams;
create policy "select_own_mock_exams" on public.mock_exams
  for select using (auth.uid() = user_id);

drop policy if exists "select_own_homework" on public.homework;
create policy "select_own_homework" on public.homework
  for select using (auth.uid() = user_id);

-- ============================================================================
-- End of migration.
-- ============================================================================
