-- users table ke columns dekhne ke liye
-- psql "$DATABASE_URL" -f scripts/inspect-users.sql

\d users

SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'users'
ORDER BY ordinal_position;
