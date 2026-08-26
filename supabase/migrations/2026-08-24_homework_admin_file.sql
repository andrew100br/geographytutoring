-- ============================================================================
-- Admin-attached homework file — additive schema migration
-- ============================================================================
-- Adds a column for a file Teacher Andrew attaches when setting homework
-- (e.g. a worksheet), separate from `uploaded_file_url` which is the
-- student's own submission. Safe to run on the live database (new nullable
-- column only). Idempotent.
-- ============================================================================

alter table public.homework add column if not exists file_url text;

-- ============================================================================
-- End of migration.
-- ============================================================================
