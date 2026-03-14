import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Deposit } from './deposit.entity';
import { Withdrawal } from './withdrawal.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { COMMISSION_LEVELS } from '../common/constants/commission.constants';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Deposit)
    private readonly depositsRepo: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalsRepo: Repository<Withdrawal>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
  ) {}

  async getBalance(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return {
      message: 'Wallet balance fetched',
      data: {
        balance: parseFloat(user.walletBalance),
        currency: 'PKR',
      },
    };
  }

  async getTransactions(userId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.txRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      message: 'Transactions fetched successfully',
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createDeposit(userId: string, dto: CreateDepositDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Your account must be active to make deposits');
    }

    const deposit = await this.depositsRepo.save(
      this.depositsRepo.create({
        userId,
        amount: dto.amount.toString(),
        kind: 'NORMAL',
        status: 'PENDING',
        paymentProofUrl: dto.paymentProofUrl ?? null,
      }),
    );

    return { message: 'Deposit request submitted successfully', data: deposit };
  }

  async getDeposits(userId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.depositsRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      message: 'Deposits fetched successfully',
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async createWithdrawal(userId: string, dto: CreateWithdrawalDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Your account must be active to make withdrawals');
    }

    const balance = parseFloat(user.walletBalance);
    if (dto.amount > balance) {
      throw new BadRequestException(
        `Insufficient balance. Available: ${balance}, Requested: ${dto.amount}`,
      );
    }

    const pendingWithdrawal = await this.withdrawalsRepo.findOne({
      where: { userId, status: 'PENDING' },
    });
    if (pendingWithdrawal) {
      throw new BadRequestException(
        'You already have a pending withdrawal request. Please wait for it to be processed.',
      );
    }

    const withdrawal = await this.withdrawalsRepo.save(
      this.withdrawalsRepo.create({
        userId,
        amount: dto.amount.toString(),
        status: 'PENDING',
      }),
    );

    return { message: 'Withdrawal request submitted successfully', data: withdrawal };
  }

  async getWithdrawals(userId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.withdrawalsRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      message: 'Withdrawals fetched successfully',
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveDeposit(depositId: string): Promise<void> {
    const deposit = await this.depositsRepo.findOne({ where: { id: depositId } });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.status !== 'PENDING') {
      throw new BadRequestException(`Deposit is already ${deposit.status.toLowerCase()}`);
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Deposit, depositId, { status: 'APPROVED' });
      await manager.increment(User, { id: deposit.userId }, 'walletBalance', parseFloat(deposit.amount));
      await manager.save(WalletTransaction, {
        userId: deposit.userId,
        type: 'DEPOSIT',
        status: 'APPROVED',
        amount: deposit.amount,
        referenceId: depositId,
        note: `Deposit approved`,
      });
    });
  }

  async rejectDeposit(depositId: string): Promise<void> {
    const deposit = await this.depositsRepo.findOne({ where: { id: depositId } });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.status !== 'PENDING') {
      throw new BadRequestException(`Deposit is already ${deposit.status.toLowerCase()}`);
    }
    await this.depositsRepo.update(depositId, { status: 'REJECTED' });
  }

  async approveWithdrawal(withdrawalId: string): Promise<void> {
    const withdrawal = await this.withdrawalsRepo.findOne({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(`Withdrawal is already ${withdrawal.status.toLowerCase()}`);
    }

    const user = await this.usersRepo.findOne({ where: { id: withdrawal.userId } });
    if (!user) throw new NotFoundException('User not found');

    const balance = parseFloat(user.walletBalance);
    const amount = parseFloat(withdrawal.amount);
    if (amount > balance) {
      throw new BadRequestException('User has insufficient balance for this withdrawal');
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Withdrawal, withdrawalId, { status: 'APPROVED' });
      await manager.decrement(User, { id: withdrawal.userId }, 'walletBalance', amount);
      await manager.save(WalletTransaction, {
        userId: withdrawal.userId,
        type: 'WITHDRAWAL',
        status: 'APPROVED',
        amount: withdrawal.amount,
        referenceId: withdrawalId,
        note: `Withdrawal approved`,
      });
    });
  }

  async rejectWithdrawal(withdrawalId: string): Promise<void> {
    const withdrawal = await this.withdrawalsRepo.findOne({ where: { id: withdrawalId } });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(`Withdrawal is already ${withdrawal.status.toLowerCase()}`);
    }
    await this.withdrawalsRepo.update(withdrawalId, { status: 'REJECTED' });
  }

  /**
   * Distributes commissions up to 5 referral levels when an initial deposit is approved.
   * Each level in the chain receives a percentage of the deposit amount.
   */
  async distributeCommissions(userId: string, depositAmount: number): Promise<void> {
    let currentUserId = userId;

    for (const { level, rate, label } of COMMISSION_LEVELS) {
      const currentUser = await this.usersRepo.findOne({
        where: { id: currentUserId },
        relations: ['referredBy'],
      });

      if (!currentUser?.referredBy) break;

      const referrer = currentUser.referredBy;
      if (referrer.status !== 'ACTIVE') {
        currentUserId = referrer.id;
        continue;
      }

      const commission = parseFloat((depositAmount * rate).toFixed(2));

      await this.dataSource.transaction(async (manager) => {
        await manager.increment(User, { id: referrer.id }, 'walletBalance', commission);
        await manager.save(WalletTransaction, {
          userId: referrer.id,
          type: 'COMMISSION',
          status: 'APPROVED',
          amount: commission.toString(),
          referenceId: userId,
          level,
          note: `${label} commission from user registration deposit`,
        });
      });

      currentUserId = referrer.id;
    }
  }
}
