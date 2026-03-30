import { MigrationInterface, QueryRunner } from 'typeorm';

/** Mirrors deposit payment proof: user uploads screenshot with withdrawal request. */
export class AddWithdrawalPaymentProofUrl1710000000006 implements MigrationInterface {
  name = 'AddWithdrawalPaymentProofUrl1710000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`withdrawals`' : '"withdrawals"'}
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`paymentProofUrl` VARCHAR(512)' : '"paymentProofUrl" character varying(512)'};
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`withdrawals`' : '"withdrawals"'} DROP COLUMN IF EXISTS ${isMysql ? '`paymentProofUrl`' : '"paymentProofUrl"'};
    `);
  }
}
