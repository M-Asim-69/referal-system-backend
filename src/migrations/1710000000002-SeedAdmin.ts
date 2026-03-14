import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';

/**
 * Seeds the default admin user (runs after FixUsersColumnNames).
 * Email: admin@platform.com  Password: Admin@123456
 */
export class SeedAdmin1710000000002 implements MigrationInterface {
  name = 'SeedAdmin1710000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const passwordHash = bcrypt.hashSync('Admin@123456', 12);
    const referralCode = randomBytes(4).toString('hex').toUpperCase();

    await queryRunner.query(`
      INSERT INTO "users" (
        "email", "passwordHash", "fullName", "role",
        "status", "referralCode", "walletBalance"
      ) VALUES (
        'admin@platform.com',
        '${passwordHash}',
        'System Administrator',
        'ADMIN',
        'ACTIVE',
        '${referralCode}',
        0
      )
      ON CONFLICT ("email") DO NOTHING;
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM "users" WHERE "email" = 'admin@platform.com';`);
  }
}
