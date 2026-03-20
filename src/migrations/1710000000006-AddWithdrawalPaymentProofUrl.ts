import { MigrationInterface, QueryRunner } from 'typeorm';

/** Mirrors deposit payment proof: user uploads screenshot with withdrawal request. */
export class AddWithdrawalPaymentProofUrl1710000000006 implements MigrationInterface {
  name = 'AddWithdrawalPaymentProofUrl1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "withdrawals"
      ADD COLUMN IF NOT EXISTS "paymentProofUrl" character varying(512);
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "withdrawals" DROP COLUMN IF EXISTS "paymentProofUrl";
    `);
  }
}
