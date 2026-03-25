import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { FilesModule } from '../files/files.module';
import { WalletTransaction } from '../wallet/wallet-transaction.entity';
import { Withdrawal } from '../wallet/withdrawal.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, WalletTransaction, Withdrawal]),
    FilesModule,
  ],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService, TypeOrmModule],
})
export class UsersModule {}
