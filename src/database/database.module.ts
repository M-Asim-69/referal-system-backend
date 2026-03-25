import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { appMigrations } from '../migrations';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('database.url') || '';
        const isRemote = !url.includes('localhost');
        const runMigrations =
          config.get<string>('runMigrationsOnStart') !== 'false';
        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize: false,
          migrations: appMigrations,
          migrationsRun: runMigrations,
          logging: config.get<string>('nodeEnv') === 'development',
          ssl: isRemote ? { rejectUnauthorized: false } : false,
          extra: {
            max: 3,
            connectionTimeoutMillis: 5000,
            idleTimeoutMillis: 10000,
          },
        };
      },
    }),
  ],
})
export class DatabaseModule {}
