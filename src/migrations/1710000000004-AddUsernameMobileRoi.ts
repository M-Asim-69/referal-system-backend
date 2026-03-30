import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddUsernameMobileRoi1710000000004 implements MigrationInterface {
  name = 'AddUsernameMobileRoi1710000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`users`' : '"users"'}
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`username` VARCHAR(255)' : '"username" character varying'},
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`mobile` VARCHAR(255)' : '"mobile" character varying'},
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`totalDepositInvestment` DECIMAL(18,2) NOT NULL DEFAULT 0' : '"totalDepositInvestment" numeric(18,2) NOT NULL DEFAULT 0'},
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`lastRoiAt` TIMESTAMP NULL' : '"lastRoiAt" TIMESTAMP'}
    `);

    if (isMysql) {
      await queryRunner.query(`
        UPDATE \`users\`
        SET \`username\` = CONCAT('u', SUBSTRING(REPLACE(\`id\`, '-', ''), 1, 12))
        WHERE \`username\` IS NULL
      `);
      await queryRunner.query(`
        ALTER TABLE \`users\` MODIFY COLUMN \`username\` VARCHAR(255) NOT NULL
      `);
      const usernameIndex = await queryRunner.query(
        "SHOW INDEX FROM `users` WHERE Key_name = 'UQ_users_username'",
      );
      if (!usernameIndex?.length) {
        await queryRunner.query(`
          CREATE UNIQUE INDEX \`UQ_users_username\` ON \`users\` (\`username\`)
        `);
      }
      await queryRunner.query(`
        UPDATE \`users\` u
        SET \`totalDepositInvestment\` = COALESCE(
          (
            SELECT SUM(CAST(d.\`amount\` AS DECIMAL(18,2)))
            FROM \`deposits\` d
            WHERE d.\`userId\` = u.\`id\` AND d.\`status\` = 'APPROVED'
          ),
          0
        )
      `);
      return;
    }

    await queryRunner.query(`
      UPDATE "users" SET "username" = 'u' || SUBSTRING(REPLACE("id"::text, '-', '') FROM 1 FOR 12)
      WHERE "username" IS NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "users" ALTER COLUMN "username" SET NOT NULL
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_users_username" ON "users" ("username")
    `);
    await queryRunner.query(`
      UPDATE "users" u SET "totalDepositInvestment" = COALESCE(
        (SELECT SUM(CAST(d."amount" AS numeric)) FROM "deposits" d WHERE d."userId" = u."id" AND d."status" = 'APPROVED'),
        0
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(
      isMysql
        ? 'DROP INDEX `UQ_users_username` ON `users`'
        : 'DROP INDEX IF EXISTS "UQ_users_username"',
    );
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`users`' : '"users"'}
      DROP COLUMN IF EXISTS ${isMysql ? '`username`' : '"username"'},
      DROP COLUMN IF EXISTS ${isMysql ? '`mobile`' : '"mobile"'},
      DROP COLUMN IF EXISTS ${isMysql ? '`totalDepositInvestment`' : '"totalDepositInvestment"'},
      DROP COLUMN IF EXISTS ${isMysql ? '`lastRoiAt`' : '"lastRoiAt"'}
    `);
  }
}
