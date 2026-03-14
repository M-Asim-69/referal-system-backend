import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import * as path from 'path';
import configuration from './configuration';

const envPath = path.resolve(process.cwd(), '.env');
const envLocalPath = path.resolve(process.cwd(), '.env.local');

@Module({
  imports: [
    NestConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      // Absolute path taake cwd alag ho to bhi .env mile
      envFilePath: [envPath, envLocalPath, '.env', '.env.local'],
    }),
  ],
})
export class ConfigModule {}
