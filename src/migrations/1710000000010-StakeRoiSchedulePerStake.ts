import { MigrationInterface, QueryRunner } from 'typeorm';

export class StakeRoiSchedulePerStake1710000000010 implements MigrationInterface {
  name = 'StakeRoiSchedulePerStake1710000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`stakes`' : '"stakes"'}
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`remainingAmount` DECIMAL(18,2) NOT NULL DEFAULT 0' : `"remainingAmount" numeric(18,2) NOT NULL DEFAULT '0'`};
    `);

    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`stakes`' : '"stakes"'}
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`nextRoiAt` TIMESTAMP NULL' : '"nextRoiAt" TIMESTAMP'};
    `);

    await queryRunner.query(`
      UPDATE ${isMysql ? '`stakes`' : '"stakes"'}
      SET ${isMysql ? '`remainingAmount`' : '"remainingAmount"'} = ${isMysql ? '`amount`' : '"amount"'}
      WHERE ${isMysql ? '`remainingAmount`' : '"remainingAmount"'} = 0;
    `);

    await queryRunner.query(`
      UPDATE ${isMysql ? '`stakes`' : '"stakes"'}
      SET ${isMysql ? '`nextRoiAt` = DATE_ADD(`createdAt`, INTERVAL 24 HOUR)' : `"nextRoiAt" = "createdAt" + INTERVAL '24 hours'`}
      WHERE ${isMysql ? '`status`' : '"status"'} = 'APPROVED' AND ${isMysql ? '`nextRoiAt`' : '"nextRoiAt"'} IS NULL;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`stakes`' : '"stakes"'} DROP COLUMN IF EXISTS ${isMysql ? '`nextRoiAt`' : '"nextRoiAt"'};
    `);
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`stakes`' : '"stakes"'} DROP COLUMN IF EXISTS ${isMysql ? '`remainingAmount`' : '"remainingAmount"'};
    `);
  }
}
