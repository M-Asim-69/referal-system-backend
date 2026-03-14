import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitSchema1710000000000 implements MigrationInterface {
  name = 'InitSchema1710000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const usersExists = await queryRunner.hasTable('users');

    if (usersExists) {
      const hasPasswordHash = await this.usersHasPasswordHashColumn(queryRunner);
      if (hasPasswordHash) {
        return; // schema already matches entity + SeedAdmin
      }
      // Broken/partial users table (e.g. sync without quoted columns) — drop deps + users, recreate
      await this.dropAllAppTables(queryRunner);
    }

    await this.createAllTables(queryRunner);
  }

  /** True if users table has quoted column "passwordHash" (entity + SeedAdmin expect it). */
  private async usersHasPasswordHashColumn(queryRunner: QueryRunner): Promise<boolean> {
    const rows = await queryRunner.query(`
      SELECT 1 FROM pg_attribute a
      JOIN pg_class c ON a.attrelid = c.oid
      JOIN pg_namespace n ON c.relnamespace = n.oid
      WHERE n.nspname = 'public' AND c.relname = 'users'
        AND a.attname = 'passwordHash' AND a.attnum > 0 AND NOT a.attisdropped
      LIMIT 1;
    `);
    return rows.length > 0;
  }

  private async dropAllAppTables(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'ALTER TABLE IF EXISTS "withdrawals" DROP CONSTRAINT IF EXISTS "FK_withdrawals_user";',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "withdrawals";');

    await queryRunner.query(
      'ALTER TABLE IF EXISTS "deposits" DROP CONSTRAINT IF EXISTS "FK_deposits_user";',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "deposits";');

    await queryRunner.query(
      'ALTER TABLE IF EXISTS "wallet_transactions" DROP CONSTRAINT IF EXISTS "FK_wallet_transactions_user";',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "wallet_transactions";');

    await queryRunner.query(
      'ALTER TABLE IF EXISTS "users" DROP CONSTRAINT IF EXISTS "FK_users_referredBy";',
    );
    await queryRunner.query('DROP TABLE IF EXISTS "users";');
  }

  private async createAllTables(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying NOT NULL,
        "passwordHash" character varying NOT NULL,
        "fullName" character varying NOT NULL,
        "role" character varying(10) NOT NULL DEFAULT 'USER',
        "status" character varying(10) NOT NULL DEFAULT 'PENDING',
        "referralCode" character varying NOT NULL,
        "referredById" uuid,
        "walletBalance" numeric(18,2) NOT NULL DEFAULT '0',
        "paymentAccountNumber" character varying,
        "paymentAccountBank" character varying,
        "profileImageUrl" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_users_email" UNIQUE ("email"),
        CONSTRAINT "UQ_users_referral_code" UNIQUE ("referralCode"),
        CONSTRAINT "PK_users_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD CONSTRAINT "FK_users_referredBy" FOREIGN KEY ("referredById") REFERENCES "users"("id") ON DELETE SET NULL;
    `);

    await queryRunner.query(`
      CREATE TABLE "wallet_transactions" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "type" character varying(20) NOT NULL,
        "status" character varying(20) NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "referenceId" character varying,
        "level" integer,
        "note" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_wallet_transactions_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "wallet_transactions"
      ADD CONSTRAINT "FK_wallet_transactions_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE TABLE "deposits" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'PENDING',
        "kind" character varying(10) NOT NULL DEFAULT 'NORMAL',
        "paymentProofUrl" character varying,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_deposits_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "deposits"
      ADD CONSTRAINT "FK_deposits_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
    `);

    await queryRunner.query(`
      CREATE TABLE "withdrawals" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_withdrawals_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      ALTER TABLE "withdrawals"
      ADD CONSTRAINT "FK_withdrawals_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await this.dropAllAppTables(queryRunner);
  }
}
