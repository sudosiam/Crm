-- DEVELOPMENT ONLY.
-- Deletes sample customers created by supabase/seed.sql.
-- Related follow-ups, test rides, sales, and activity are removed by foreign keys.

delete from public.customers where is_sample = true;
