-- InitSchema dubara chalane ke liye (broken users table fix)
-- Phir: npm run migration:run
--
-- psql "$DATABASE_URL" -f scripts/clear-migrations.sql

TRUNCATE TABLE migrations RESTART IDENTITY;
