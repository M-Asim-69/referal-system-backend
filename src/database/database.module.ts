import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { appMigrations } from '../migrations';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const dbType = (config.get<string>('database.type') || 'mysql') as
          | 'mysql'
          | 'postgres';
        const url = config.get<string>('database.url') || '';
        const runMigrations =
          config.get<string>('runMigrationsOnStart') !== 'false';
        return {
          type: dbType,
          url,
          autoLoadEntities: true,
          synchronize: false,
          migrations: appMigrations,
          migrationsRun: runMigrations,
          logging: config.get<string>('nodeEnv') === 'development',
          ...(dbType === 'postgres'
            ? {
                ssl: !url.includes('localhost')
                  ? { rejectUnauthorized: false }
                  : false,
                extra: {
                  max: 3,
                  connectionTimeoutMillis: 5000,
                  idleTimeoutMillis: 10000,
                },
              }
            : {
                // mysql2 pool options
                extra: {
                  connectionLimit: 10,
                  connectTimeout: 10000,
                },
              }),
        };
      },
    }),
  ],
})
export class DatabaseModule {}
