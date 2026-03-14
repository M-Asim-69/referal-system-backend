import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deposit entity has @UpdateDateColumn updatedAt — InitSchema deposits table lacked it.
 */
export class AddDepositsUpdatedAt1710000000003 implements MigrationInterface {
  name = 'AddDepositsUpdatedAt1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "deposits"
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "deposits" DROP COLUMN IF EXISTS "updatedAt";
    `);
  }
}
