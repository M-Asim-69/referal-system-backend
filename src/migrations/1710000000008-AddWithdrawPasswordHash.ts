import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWithdrawPasswordHash1710000000008 implements MigrationInterface {
  name = 'AddWithdrawPasswordHash1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(
      `ALTER TABLE ${isMysql ? '`users`' : '"users"'} ADD COLUMN IF NOT EXISTS ${isMysql ? '`withdrawPasswordHash` VARCHAR(255)' : '"withdrawPasswordHash" character varying(255)'}`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(
      `ALTER TABLE ${isMysql ? '`users`' : '"users"'} DROP COLUMN IF EXISTS ${isMysql ? '`withdrawPasswordHash`' : '"withdrawPasswordHash"'}`,
    );
  }
}
