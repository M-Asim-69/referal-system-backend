import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Runs BEFORE SeedAdmin. Renames snake_case/lowercase password columns to "passwordHash"
 * so entity + SeedAdmin INSERT match the table.
 */
export class FixUsersColumnNames1710000000001 implements MigrationInterface {
  name = 'FixUsersColumnNames1710000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';

    if (isMysql) {
      const hasPasswordHash = await queryRunner.hasColumn(
        'users',
        'passwordHash',
      );
      const hasPasswordSnake = await queryRunner.hasColumn(
        'users',
        'password_hash',
      );
      const hasPasswordLower = await queryRunner.hasColumn(
        'users',
        'passwordhash',
      );

      if (!hasPasswordHash && hasPasswordSnake) {
        await queryRunner.query(
          'ALTER TABLE `users` CHANGE COLUMN `password_hash` `passwordHash` varchar(255) NOT NULL',
        );
      }
      if (!hasPasswordHash && hasPasswordLower) {
        await queryRunner.query(
          'ALTER TABLE `users` CHANGE COLUMN `passwordhash` `passwordHash` varchar(255) NOT NULL',
        );
      }
      return;
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'password_hash'
        ) AND NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'passwordHash'
        ) THEN
          ALTER TABLE "users" RENAME COLUMN password_hash TO "passwordHash";
        END IF;
      END $$;
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'passwordhash'
        ) AND NOT EXISTS (
          SELECT 1 FROM pg_attribute a
          JOIN pg_class c ON a.attrelid = c.oid
          JOIN pg_namespace n ON c.relnamespace = n.oid
          WHERE n.nspname = 'public' AND c.relname = 'users' AND a.attname = 'passwordHash' AND a.attnum > 0 AND NOT a.attisdropped
        ) THEN
          ALTER TABLE "users" RENAME COLUMN passwordhash TO "passwordHash";
        END IF;
      END $$;
    `);
  }

  public async down(): Promise<void> {}
}
