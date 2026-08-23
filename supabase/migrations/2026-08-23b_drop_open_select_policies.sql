-- ============================================================================
-- Drop the pre-existing "viewable by everyone" policies on profiles/bookings
-- ============================================================================
-- The previous migration (2026-08-23_lock_down_profiles_and_bookings_rls.sql)
-- added `select_own_*` policies expecting them to restrict access, but two
-- older, wide-open SELECT policies already existed on these tables from the
-- original project setup:
--   - "Bookings viewable by everyone"   (bookings, qual: true)
--   - "Profiles are viewable by everyone" (profiles, qual: true)
-- Postgres OR's every PERMISSIVE policy together for the same command, so
-- these two alone were enough to expose every row to every signed-in (or,
-- per a follow-up unauthenticated test, even signed-out) request regardless
-- of the new restrictive-looking policy sitting next to them. Confirmed live
-- after the previous migration: an anon-key request still returned all rows.
--
-- This migration drops only those two legacy policies. The `select_own_*`
-- policies added previously remain and now take full effect. No other
-- policy, table, or row is touched.
-- ============================================================================

drop policy if exists "Bookings viewable by everyone" on public.bookings;
drop policy if exists "Profiles are viewable by everyone" on public.profiles;

-- ============================================================================
-- End of migration.
-- ============================================================================
