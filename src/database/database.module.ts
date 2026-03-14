import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('database.url') || '';
        const isRemote = !url.includes('localhost');
        return {
          type: 'postgres',
          url,
          autoLoadEntities: true,
          synchronize: false,
          logging: config.get<string>('nodeEnv') === 'development',
          ssl: isRemote ? { rejectUnauthorized: false } : false,
        };
      },
    }),
  ],
})
export class DatabaseModule {}
