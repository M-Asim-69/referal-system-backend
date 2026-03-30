import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIssues1710000000009 implements MigrationInterface {
  name = 'CreateIssues1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${isMysql ? '`issues`' : '"issues"'} (
        ${isMysql ? '`id` varchar(36) NOT NULL DEFAULT (UUID())' : '"id" uuid NOT NULL DEFAULT uuid_generate_v4()'},
        ${isMysql ? '`userId` varchar(36) NOT NULL' : '"userId" uuid NOT NULL'},
        ${isMysql ? '`email` varchar(255) NOT NULL' : '"email" character varying(255) NOT NULL'},
        ${isMysql ? '`mobile` varchar(30) NOT NULL' : '"mobile" character varying(30) NOT NULL'},
        ${isMysql ? '`subject` varchar(255) NOT NULL' : '"subject" character varying(255) NOT NULL'},
        ${isMysql ? '`message` text NOT NULL' : '"message" text NOT NULL'},
        ${isMysql ? "`status` varchar(10) NOT NULL DEFAULT 'OPEN'" : `"status" character varying(10) NOT NULL DEFAULT 'OPEN'`},
        ${isMysql ? '`createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP' : '"createdAt" TIMESTAMP NOT NULL DEFAULT now()'},
        CONSTRAINT ${isMysql ? '`PK_issues_id`' : '"PK_issues_id"'} PRIMARY KEY (${isMysql ? '`id`' : '"id"'})
      );
    `);

    if (isMysql) {
      const fkExists = await queryRunner.query(`
        SELECT 1
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'issues'
          AND CONSTRAINT_NAME = 'FK_issues_user'
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        LIMIT 1
      `);
      if (!fkExists?.length) {
        await queryRunner.query(`
          ALTER TABLE \`issues\`
          ADD CONSTRAINT \`FK_issues_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`)
          ON DELETE CASCADE ON UPDATE NO ACTION
        `);
      }
      const userIdx = await queryRunner.query(
        "SHOW INDEX FROM `issues` WHERE Key_name = 'IDX_issues_userId'",
      );
      if (!userIdx?.length) {
        await queryRunner.query(
          'CREATE INDEX `IDX_issues_userId` ON `issues` (`userId`)',
        );
      }
      const createdIdx = await queryRunner.query(
        "SHOW INDEX FROM `issues` WHERE Key_name = 'IDX_issues_createdAt'",
      );
      if (!createdIdx?.length) {
        await queryRunner.query(
          'CREATE INDEX `IDX_issues_createdAt` ON `issues` (`createdAt`)',
        );
      }
      return;
    }

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'FK_issues_user'
        ) THEN
          ALTER TABLE "issues"
          ADD CONSTRAINT "FK_issues_user" FOREIGN KEY ("userId") REFERENCES "users"("id")
          ON DELETE CASCADE ON UPDATE NO ACTION;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_issues_userId" ON "issues" ("userId");`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_issues_createdAt" ON "issues" ("createdAt");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(
      isMysql
        ? 'DROP INDEX `IDX_issues_createdAt` ON `issues`;'
        : `DROP INDEX IF EXISTS "IDX_issues_createdAt";`,
    );
    await queryRunner.query(
      isMysql
        ? 'DROP INDEX `IDX_issues_userId` ON `issues`;'
        : `DROP INDEX IF EXISTS "IDX_issues_userId";`,
    );
    await queryRunner.query(
      isMysql
        ? 'ALTER TABLE `issues` DROP FOREIGN KEY `FK_issues_user`;'
        : `ALTER TABLE "issues" DROP CONSTRAINT IF EXISTS "FK_issues_user";`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${isMysql ? '`issues`' : '"issues"'};`,
    );
  }
}
