import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL || '';
const dbType = (process.env.DB_TYPE || 'mysql') as 'mysql' | 'postgres';

const AppDataSource = new DataSource({
  type: dbType,
  url,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/[0-9]*-*.ts'],
  synchronize: false,
  ...(dbType === 'postgres'
    ? {
        ssl: !url.includes('localhost') ? { rejectUnauthorized: false } : false,
      }
    : {}),
});

export default AppDataSource;
