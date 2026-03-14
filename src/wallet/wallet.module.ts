import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WalletTransaction } from './wallet-transaction.entity';
import { Deposit } from './deposit.entity';
import { Withdrawal } from './withdrawal.entity';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([WalletTransaction, Deposit, Withdrawal]),
    UsersModule,
  ],
  controllers: [WalletController],
  providers: [WalletService],
  exports: [WalletService, TypeOrmModule],
})
export class WalletModule {}
