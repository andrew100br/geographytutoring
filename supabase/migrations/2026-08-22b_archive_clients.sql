-- ============================================================================
-- Archive clients — additive schema migration
-- ============================================================================
-- Adds a single admin-only organizational flag to `profiles`. Purely cosmetic
-- on the admin dashboard's Client Database list — does not touch the
-- student's login, credits, or ability to book. Safe to run on the live
-- database (new nullable/defaulted column only). Idempotent.
-- ============================================================================

alter table public.profiles add column if not exists is_archived boolean not null default false;

-- ============================================================================
-- End of migration.
-- ============================================================================
