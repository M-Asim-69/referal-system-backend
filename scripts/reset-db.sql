-- =============================================================================
-- NUCLEAR RESET — Postgres public schema (sab tables + migrations khatam)
-- =============================================================================
-- Run:
--   psql "$DATABASE_URL" -f scripts/reset-db.sql
--   npm run migration:run
--
-- Ya:
--   npm run db:reset
-- =============================================================================

DROP SCHEMA IF EXISTS public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- uuid extension (InitSchema / TypeORM bhi create karte hain)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
