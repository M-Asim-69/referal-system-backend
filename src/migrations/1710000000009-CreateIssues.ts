import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateIssues1710000000009 implements MigrationInterface {
  name = 'CreateIssues1710000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "issues" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "userId" uuid NOT NULL,
        "email" character varying(255) NOT NULL,
        "mobile" character varying(30) NOT NULL,
        "subject" character varying(255) NOT NULL,
        "message" text NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'OPEN',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_issues_id" PRIMARY KEY ("id")
      );
    `);

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
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_issues_createdAt";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_issues_userId";`);
    await queryRunner.query(
      `ALTER TABLE "issues" DROP CONSTRAINT IF EXISTS "FK_issues_user";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "issues";`);
  }
}
