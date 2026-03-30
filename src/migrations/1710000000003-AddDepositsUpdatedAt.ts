import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Deposit entity has @UpdateDateColumn updatedAt — InitSchema deposits table lacked it.
 */
export class AddDepositsUpdatedAt1710000000003 implements MigrationInterface {
  name = 'AddDepositsUpdatedAt1710000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`deposits`' : '"deposits"'}
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`updatedAt`' : '"updatedAt"'} TIMESTAMP NOT NULL DEFAULT ${isMysql ? 'CURRENT_TIMESTAMP' : 'now()'};
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`deposits`' : '"deposits"'} DROP COLUMN IF EXISTS ${isMysql ? '`updatedAt`' : '"updatedAt"'};
    `);
  }
}
