import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { User } from '../users/user.entity';
import { Deposit } from '../wallet/deposit.entity';
import { Withdrawal } from '../wallet/withdrawal.entity';
import { Stake } from '../wallet/stake.entity';
import { WalletTransaction } from '../wallet/wallet-transaction.entity';
import { WalletModule } from '../wallet/wallet.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Deposit,
      Withdrawal,
      Stake,
      WalletTransaction,
    ]),
    WalletModule,
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
