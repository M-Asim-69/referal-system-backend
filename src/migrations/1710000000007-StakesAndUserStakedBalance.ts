import { MigrationInterface, QueryRunner } from 'typeorm';

export class StakesAndUserStakedBalance1710000000007 implements MigrationInterface {
  name = 'StakesAndUserStakedBalance1710000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS ${isMysql ? '`stakes`' : '"stakes"'} (
        ${isMysql ? '`id` varchar(36) NOT NULL DEFAULT (UUID())' : '"id" uuid NOT NULL DEFAULT gen_random_uuid()'},
        ${isMysql ? '`userId` varchar(36) NOT NULL' : '"userId" uuid NOT NULL'},
        ${isMysql ? '`amount` decimal(18,2) NOT NULL' : '"amount" numeric(18,2) NOT NULL'},
        ${isMysql ? "`status` varchar(10) NOT NULL DEFAULT 'PENDING'" : `"status" character varying(10) NOT NULL DEFAULT 'PENDING'`},
        ${isMysql ? '`createdAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP' : '"createdAt" TIMESTAMP NOT NULL DEFAULT now()'},
        ${isMysql ? '`updatedAt` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' : '"updatedAt" TIMESTAMP NOT NULL DEFAULT now()'},
        CONSTRAINT ${isMysql ? '`PK_stakes_id`' : '"PK_stakes_id"'} PRIMARY KEY (${isMysql ? '`id`' : '"id"'})
      );
    `);

    if (isMysql) {
      const fkExists = await queryRunner.query(`
        SELECT 1
        FROM information_schema.TABLE_CONSTRAINTS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'stakes'
          AND CONSTRAINT_NAME = 'FK_stakes_user'
          AND CONSTRAINT_TYPE = 'FOREIGN KEY'
        LIMIT 1
      `);
      if (!fkExists?.length) {
        await queryRunner.query(`
          ALTER TABLE \`stakes\`
          ADD CONSTRAINT \`FK_stakes_user\` FOREIGN KEY (\`userId\`) REFERENCES \`users\`(\`id\`) ON DELETE CASCADE
        `);
      }
    } else {
      await queryRunner.query(`
        DO $$ BEGIN
          ALTER TABLE "stakes"
          ADD CONSTRAINT "FK_stakes_user" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE;
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
    }

    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`users`' : '"users"'}
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`stakedBalance` DECIMAL(18,2) NOT NULL DEFAULT 0' : `"stakedBalance" numeric(18,2) NOT NULL DEFAULT '0'`};
    `);
    await queryRunner.query(`
      ALTER TABLE ${isMysql ? '`users`' : '"users"'}
      ADD COLUMN IF NOT EXISTS ${isMysql ? '`lastStakeRoiAt` TIMESTAMP NULL' : '"lastStakeRoiAt" TIMESTAMP'};
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const isMysql = queryRunner.connection.options.type === 'mysql';
    await queryRunner.query(
      isMysql
        ? 'ALTER TABLE `stakes` DROP FOREIGN KEY `FK_stakes_user`;'
        : `ALTER TABLE "stakes" DROP CONSTRAINT IF EXISTS "FK_stakes_user";`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS ${isMysql ? '`stakes`' : '"stakes"'};`,
    );
    await queryRunner.query(
      `ALTER TABLE ${isMysql ? '`users`' : '"users"'} DROP COLUMN IF EXISTS ${isMysql ? '`lastStakeRoiAt`' : '"lastStakeRoiAt"'};`,
    );
    await queryRunner.query(
      `ALTER TABLE ${isMysql ? '`users`' : '"users"'} DROP COLUMN IF EXISTS ${isMysql ? '`stakedBalance`' : '"stakedBalance"'};`,
    );
  }
}
