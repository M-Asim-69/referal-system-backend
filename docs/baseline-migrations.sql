-- Run this ONLY if you prefer to mark old migrations as done without re-running InitSchema.
-- After this, `npm run migration:run` will run only migrations not in this list.
--
-- psql "$DATABASE_URL" -f docs/baseline-migrations.sql
--
-- TypeORM migrations table: (timestamp, name) must match migration class name property.

INSERT INTO migrations ("timestamp", "name") VALUES
  (1710000000000, 'InitSchema1710000000000'),
  (1710000000001, 'SeedAdmin1710000000001')
ON CONFLICT DO NOTHING;

-- If your migrations table has no unique constraint on name, use instead:
-- INSERT INTO migrations ("timestamp", "name") SELECT 1710000000000, 'InitSchema1710000000000'
-- WHERE NOT EXISTS (SELECT 1 FROM migrations WHERE name = 'InitSchema1710000000000');
-- (repeat for SeedAdmin)
