-- ============================================================================
-- Lock down `profiles` and `bookings` with Row-Level Security
-- ============================================================================
-- These two tables predate this repo's migration history and currently have
-- NO row-level security: any signed-in user (or, if grants are wide enough,
-- anyone with the public anon key) can query them directly from the browser
-- and read every client's bookings, email, parent/child name, and credit
-- balance — confirmed live against production, where an unauthenticated
-- direct query returned rows across every client rather than just the
-- caller's own.
--
-- Every privileged read/write in this app already goes through a Netlify
-- function using the SERVICE ROLE key (admin-action.js, student-action.js,
-- public-action.js, stripe-webhook.js), which bypasses RLS entirely and is
-- therefore unaffected by this migration. The only direct-from-browser reads
-- of these two tables are already scoped to the signed-in user's own row
-- (`src/app/booking/page.tsx`), so this migration only closes the gap —
-- it does not change any legitimate access pattern.
--
-- Safe to run on the live database: adds row-security policies only, drops
-- nothing, alters no columns, touches no existing rows. Idempotent.
-- ============================================================================

alter table public.profiles enable row level security;
alter table public.bookings enable row level security;

drop policy if exists "select_own_profile" on public.profiles;
create policy "select_own_profile" on public.profiles
  for select using (auth.uid() = id);

-- Self-signup on the booking portal inserts the new user's own profile row.
drop policy if exists "insert_own_profile" on public.profiles;
create policy "insert_own_profile" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "select_own_bookings" on public.bookings;
create policy "select_own_bookings" on public.bookings
  for select using (auth.uid() = user_id);

-- ============================================================================
-- End of migration.
-- ============================================================================
