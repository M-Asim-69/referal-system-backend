# DB scripts (Postgres)

## Pehle columns dekho (read DB)

```bash
export DATABASE_URL="postgresql://user:pass@host:5432/dbname"
npm run db:inspect-users
```

Ya direct:

```bash
psql "$DATABASE_URL" -c "\d users"
psql "$DATABASE_URL" -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'users' ORDER BY ordinal_position;"
```

## psql error: database "dev" does not exist

`psql` bina URL ke OS user `dev` se DB `dev` dhundhta hai. Hamesha full URL do:

```bash
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/chatapp"
psql "$DATABASE_URL" -c "SELECT 1"
```

## InitSchema dubara chalana (broken users / passwordHash missing)

Agar pehle migrations run ho chuki hain lekin `users` galat columns wali hai:

```bash
export DATABASE_URL="postgresql://..."
psql "$DATABASE_URL" -f scripts/clear-migrations.sql
npm run migration:run
```

Ab **InitSchema** dubara chalegi: agar `users` hai lekin **`passwordHash`** column nahi → **saari app tables drop** → sahi schema dubara create → **SeedAdmin** theek chalegi.

## Reset + migrations dubara (fix column mismatch)

**Warning:** Saara `public` schema drop ho jata hai — **backup** le lo agar data chahiye.

```bash
cd /path/to/backend
export DATABASE_URL="postgresql://..."
npm run db:reset
```

Steps:
1. `scripts/reset-db.sql` → `DROP SCHEMA public CASCADE` + `CREATE SCHEMA public`
2. `npm run migration:run` → InitSchema tables camelCase quoted columns ke sath banati hai, phir SeedAdmin admin insert karti hai

## Sirf SQL reset (manual)

```bash
psql "$DATABASE_URL" -f scripts/reset-db.sql
npm run migration:run
```
