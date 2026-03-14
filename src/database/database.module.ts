import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        url: config.get<string>('database.url'),
        autoLoadEntities: true,
        synchronize: false,
        logging: config.get<string>('nodeEnv') === 'development',
      }),
    }),
  ],
})
export class DatabaseModule {}
