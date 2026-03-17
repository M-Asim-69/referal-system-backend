import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Deposit } from './deposit.entity';
import { Withdrawal } from './withdrawal.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilesService } from '../files/files.service';
import {
  APP_CURRENCY,
  COMMISSION_LEVELS,
  MIN_DEPOSIT,
  MIN_WITHDRAWAL,
  ROI_DAILY_RATE,
} from '../common/constants/commission.constants';

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
    private readonly filesService: FilesService,
  ) {}

  async getBalance(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    return {
      message: 'Wallet balance fetched',
      data: {
        balance: parseFloat(user.walletBalance),
        currency: APP_CURRENCY,
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

  async createDeposit(
    userId: string,
    dto: CreateDepositDto,
    file: Express.Multer.File | undefined,
  ) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Your account must be active to make deposits');
    }

    const pendingDeposit = await this.depositsRepo.findOne({
      where: { userId, status: 'PENDING', kind: 'NORMAL' },
      order: { createdAt: 'DESC' },
    });
    if (pendingDeposit) {
      throw new BadRequestException(
        'You already have a pending deposit request. Please wait for admin approval (or rejection) before submitting a new one.',
      );
    }

    if (dto.amount < MIN_DEPOSIT) {
      throw new BadRequestException(`Minimum deposit is $${MIN_DEPOSIT}`);
    }
    if (!file?.buffer?.length) {
      throw new BadRequestException('Payment proof screenshot is required (field name: screenshot)');
    }

    const upload = await this.filesService.uploadImage(file, 'deposits');
    const paymentProofUrl = upload.data.url;

    const deposit = await this.depositsRepo.save(
      this.depositsRepo.create({
        userId,
        amount: dto.amount.toString(),
        kind: 'NORMAL',
        status: 'PENDING',
        paymentProofUrl,
      }),
    );

    return {
      message: 'Deposit request submitted. Please wait up to 24 hours for admin approval.',
      data: deposit,
    };
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

    if (dto.amount < MIN_WITHDRAWAL) {
      throw new BadRequestException(`Minimum withdrawal is $${MIN_WITHDRAWAL}`);
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

    const amount = parseFloat(deposit.amount);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Deposit, depositId, { status: 'APPROVED' });
      await manager.increment(User, { id: deposit.userId }, 'walletBalance', amount);
      await manager.increment(User, { id: deposit.userId }, 'totalDepositInvestment', amount);
      await manager.save(WalletTransaction, {
        userId: deposit.userId,
        type: 'DEPOSIT',
        status: 'APPROVED',
        amount: deposit.amount,
        referenceId: depositId,
        note: 'Deposit approved',
      });
    });

    await this.distributeCommissions(deposit.userId, amount);
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
   * Level income 10,5,3,2,1%. Only referrers who have at least one approved deposit receive commission.
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
      const referrerHasDeposit = await this.depositsRepo.findOne({
        where: { userId: referrer.id, status: 'APPROVED' },
      });
      if (!referrerHasDeposit) {
        currentUserId = referrer.id;
        continue;
      }

      const commission = parseFloat((depositAmount * rate).toFixed(2));
      if (commission <= 0) {
        currentUserId = referrer.id;
        continue;
      }

      await this.dataSource.transaction(async (manager) => {
        await manager.increment(User, { id: referrer.id }, 'walletBalance', commission);
        await manager.save(WalletTransaction, {
          userId: referrer.id,
          type: 'COMMISSION',
          status: 'APPROVED',
          amount: commission.toString(),
          referenceId: userId,
          level,
          note: `${label} from referral deposit`,
        });
      });

      currentUserId = referrer.id;
    }
  }

  /** Daily 2% ROI on totalDepositInvestment. Runs at 00:00 UTC. */
  @Cron('0 0 * * *')
  async runDailyRoi(): Promise<void> {
    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const users = await this.usersRepo.find({
      where: {},
      select: ['id', 'totalDepositInvestment', 'lastRoiAt', 'walletBalance'],
    });

    for (const u of users) {
      const investment = parseFloat(u.totalDepositInvestment);
      if (investment <= 0) continue;
      const lastRoi = u.lastRoiAt ? new Date(u.lastRoiAt) : null;
      if (lastRoi && lastRoi >= startOfToday) continue;

      const roiAmount = parseFloat((investment * ROI_DAILY_RATE).toFixed(2));
      if (roiAmount <= 0) continue;

      await this.dataSource.transaction(async (manager) => {
        await manager.increment(User, { id: u.id }, 'walletBalance', roiAmount);
        await manager.update(User, { id: u.id }, { lastRoiAt: new Date() });
        await manager.save(WalletTransaction, {
          userId: u.id,
          type: 'COMMISSION',
          status: 'APPROVED',
          amount: roiAmount.toString(),
          referenceId: null,
          level: null,
          note: 'Daily ROI (2%)',
        });
      });
    }
  }
}
