import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernameMobileRoi1710000000004 implements MigrationInterface {
  name = 'AddUsernameMobileRoi1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "username" character varying,
      ADD COLUMN IF NOT EXISTS "mobile" character varying,
      ADD COLUMN IF NOT EXISTS "totalDepositInvestment" numeric(18,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "lastRoiAt" TIMESTAMP
    `);
    await queryRunner.query(`
      UPDATE "users" SET "username" = 'u' || SUBSTRING(REPLACE("id"::text, '-', '') FROM 1 FOR 12)
      WHERE "username" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_username" ON "users" ("username")
    `);
    await queryRunner.query(`
      UPDATE "users" u SET "totalDepositInvestment" = COALESCE(
        (SELECT SUM(CAST(d."amount" AS numeric)) FROM "deposits" d WHERE d."userId" = u."id" AND d."status" = 'APPROVED'),
        0
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS "UQ_users_username"');
    await queryRunner.query(`
      ALTER TABLE "users"
      DROP COLUMN IF EXISTS "username",
      DROP COLUMN IF EXISTS "mobile",
      DROP COLUMN IF EXISTS "totalDepositInvestment",
      DROP COLUMN IF EXISTS "lastRoiAt"
    `);
  }
}
