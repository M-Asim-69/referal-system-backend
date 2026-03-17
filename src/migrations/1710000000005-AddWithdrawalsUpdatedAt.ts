import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Withdrawal entity has @UpdateDateColumn updatedAt — InitSchema withdrawals table lacked it.
 */
export class AddWithdrawalsUpdatedAt1710000000005 implements MigrationInterface {
  name = 'AddWithdrawalsUpdatedAt1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "withdrawals"
      ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now();
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "withdrawals" DROP COLUMN IF EXISTS "updatedAt";
    `);
  }
}

