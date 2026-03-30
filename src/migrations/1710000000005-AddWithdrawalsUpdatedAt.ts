import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Withdrawal entity has @UpdateDateColumn updatedAt — InitSchema withdrawals table lacked it.
 */
export class AddWithdrawalsUpdatedAt1710000000005 implements MigrationInterface {
  name = 'AddWithdrawalsUpdatedAt1710000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`withdrawals`' : '"withdrawals"'}
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`updatedAt`' : '"updatedAt"'} TIMESTAMP NOT NULL DEFAULT ${isMysql ? 'CURRENT_TIMESTAMP' : 'now()'};
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`withdrawals`' : '"withdrawals"'} DROP COLUMN IF EXISTS ${isMysql ? '`updatedAt`' : '"updatedAt"'};
    `);
  }
}
