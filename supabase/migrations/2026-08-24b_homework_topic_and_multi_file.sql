-- ============================================================================
-- Homework: custom lesson label + multiple attached files
-- ============================================================================
-- - `topic`: a free-text label the admin can set (e.g. "Lesson 1" for the
--   first lesson of a new course), overriding the auto-computed
--   "Lesson N" number shown when no topic is set. Mirrors lesson_notes.topic.
-- - `file_urls`: replaces the single `file_url` with an array so more than
--   one file can be attached to a homework entry. `file_url` is left in
--   place (not dropped) and backfilled into `file_urls` so the one real
--   homework entry already live (Jacob's, with the hydrograph PNG) keeps
--   its attachment.
--
-- Safe to run on the live database: additive columns + a backfill of
-- existing data only. Idempotent.
-- ============================================================================

alter table public.homework add column if not exists topic text;
alter table public.homework add column if not exists file_urls text[] not null default '{}';

update public.homework
set file_urls = array[file_url]
where file_url is not null and file_urls = '{}';

-- ============================================================================
-- End of migration.
-- ============================================================================
