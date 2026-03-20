import { MigrationInterface, QueryRunner } from 'typeorm';

export class StakesAndUserStakedBalance1710000000007 implements MigrationInterface {
  name = 'StakesAndUserStakedBalance1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "stakes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "amount" numeric(18,2) NOT NULL,
        "status" character varying(10) NOT NULL DEFAULT 'PENDING',
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_stakes_id" PRIMARY KEY ("id")
      );
    `);
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE "stakes"
        ADD CONSTRAINT "FK_stakes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);

    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "stakedBalance" numeric(18,2) NOT NULL DEFAULT '0';
    `);
    await queryRunner.query(`
      ALTER TABLE "users"
      ADD COLUMN IF NOT EXISTS "lastStakeRoiAt" TIMESTAMP;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "stakes" DROP CONSTRAINT IF EXISTS "FK_stakes_user";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "stakes";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "lastStakeRoiAt";`);
    await queryRunner.query(`ALTER TABLE "users" DROP COLUMN IF EXISTS "stakedBalance";`);
  }
}
