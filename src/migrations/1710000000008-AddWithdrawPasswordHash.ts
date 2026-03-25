import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddWithdrawPasswordHash1710000000008 implements MigrationInterface {
  name = 'AddWithdrawPasswordHash1710000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "withdrawPasswordHash" character varying(255)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "withdrawPasswordHash"`,
    );
  }
}
