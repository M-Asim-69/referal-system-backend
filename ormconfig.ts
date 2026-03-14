import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config();

const url = process.env.DATABASE_URL || '';
const isRemote = !url.includes('localhost');

const AppDataSource = new DataSource({
  type: 'postgres',
  url,
  entities: ['src/**/*.entity.ts'],
  migrations: ['src/migrations/*.ts'],
  synchronize: false,
  ssl: isRemote ? { rejectUnauthorized: false } : false,
});

export default AppDataSource;
