import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User } from '../users/user.entity';
import { Deposit } from './deposit.entity';
import { Withdrawal } from './withdrawal.entity';
import { Stake } from './stake.entity';
import { WalletTransaction } from './wallet-transaction.entity';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { CreateStakeDto } from './dto/create-stake.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilesService } from '../files/files.service';
import {
  APP_CURRENCY,
  COMMISSION_LEVELS,
  MIN_DEPOSIT,
  MIN_STAKE,
  MIN_WITHDRAWAL,
  STAKE_ROI_DAILY_RATE,
} from '../common/constants/commission.constants';

const ROI_INTERVAL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Deposit)
    private readonly depositsRepo: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalsRepo: Repository<Withdrawal>,
    @InjectRepository(Stake)
    private readonly stakesRepo: Repository<Stake>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    private readonly dataSource: DataSource,
    private readonly filesService: FilesService,
  ) {}

  async getBalance(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    const balance = parseFloat(user.walletBalance);
    const stakedBalance = parseFloat(user.stakedBalance ?? '0');
    const withdrawableAmount = parseFloat((balance + stakedBalance).toFixed(2));
    return {
      message: 'Wallet balance fetched',
      data: {
        balance,
        stakedBalance,
        withdrawableAmount,
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
      throw new BadRequestException(
        'Your account must be active to make deposits',
      );
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
      throw new BadRequestException(
        'Payment proof screenshot is required (field name: screenshot)',
      );
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
      message:
        'Deposit request submitted. Please wait up to 24 hours for admin approval.',
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

  async createWithdrawal(
    userId: string,
    dto: CreateWithdrawalDto,
    file: Express.Multer.File | undefined,
  ) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException(
        'Your account must be active to make withdrawals',
      );
    }

    if (dto.amount < MIN_WITHDRAWAL) {
      throw new BadRequestException(`Minimum withdrawal is $${MIN_WITHDRAWAL}`);
    }
    const walletBalance = parseFloat(user.walletBalance);
    const stakedBalance = parseFloat(user.stakedBalance ?? '0');
    const withdrawableAmount = parseFloat(
      (walletBalance + stakedBalance).toFixed(2),
    );
    if (dto.amount > withdrawableAmount) {
      throw new BadRequestException(
        `Insufficient balance. Withdrawable: ${withdrawableAmount}, Requested: ${dto.amount}`,
      );
    }

    const pendingWithdrawal = await this.withdrawalsRepo.findOne({
      where: { userId, status: 'PENDING' },
    });
    if (pendingWithdrawal) {
      throw new BadRequestException(
        'You already have a pending withdrawal request. Please wait for admin approval (or rejection) before submitting a new one.',
      );
    }

    if (!file?.buffer?.length) {
      throw new BadRequestException(
        'Withdrawal proof screenshot is required (field name: screenshot), same as deposit flow.',
      );
    }

    const upload = await this.filesService.uploadImage(file, 'withdrawals');
    const paymentProofUrl = upload.data.url;

    const withdrawal = await this.withdrawalsRepo.save(
      this.withdrawalsRepo.create({
        userId,
        amount: dto.amount.toString(),
        status: 'PENDING',
        paymentProofUrl,
      }),
    );

    return {
      message:
        'Withdrawal request submitted. Please wait for admin approval. Only one pending request at a time.',
      data: withdrawal,
    };
  }

  async createStakeRequest(userId: string, dto: CreateStakeDto) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'ACTIVE') {
      throw new BadRequestException('Your account must be active to stake');
    }

    const totalDeposited = parseFloat(user.totalDepositInvestment);
    if (totalDeposited <= 0) {
      throw new BadRequestException(
        'You need an approved deposit before you can stake. Deposit funds first.',
      );
    }

    if (dto.amount < MIN_STAKE) {
      throw new BadRequestException(`Minimum stake is $${MIN_STAKE}`);
    }

    const wallet = parseFloat(user.walletBalance);
    if (dto.amount > wallet) {
      throw new BadRequestException(
        `Insufficient wallet balance. Available: ${wallet}, requested: ${dto.amount}`,
      );
    }

    const amount = dto.amount;
    const stake = await this.dataSource.transaction(async (manager) => {
      const createdStake = await manager.save(
        Stake,
        this.stakesRepo.create({
          userId,
          amount: amount.toString(),
          remainingAmount: amount.toString(),
          status: 'APPROVED',
          nextRoiAt: new Date(Date.now() + ROI_INTERVAL_MS),
        }),
      );
      await manager.decrement(User, { id: userId }, 'walletBalance', amount);
      await manager.increment(User, { id: userId }, 'stakedBalance', amount);
      await manager.save(WalletTransaction, {
        userId,
        type: 'STAKE',
        status: 'APPROVED',
        amount: amount.toString(),
        referenceId: createdStake.id,
        note: 'Stake applied instantly — moved from wallet to staked balance',
      });
      // Distribute referral commissions atomically inside the same transaction
      await this.distributeCommissionsInManager(
        manager,
        userId,
        createdStake.id,
        amount,
      );
      return createdStake;
    });

    return {
      message:
        'Stake applied successfully. Funds moved from wallet to staked balance; first ROI is after 24 hours.',
      data: stake,
    };
  }

  async getStakes(userId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.stakesRepo.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      message: 'Stakes fetched successfully',
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveStake(stakeId: string): Promise<void> {
    const stake = await this.stakesRepo.findOne({ where: { id: stakeId } });
    if (!stake) throw new NotFoundException('Stake request not found');
    if (stake.status !== 'PENDING') {
      throw new BadRequestException(
        `Stake is already ${stake.status.toLowerCase()}`,
      );
    }

    const user = await this.usersRepo.findOne({ where: { id: stake.userId } });
    if (!user) throw new NotFoundException('User not found');

    const amount = parseFloat(stake.amount);
    const wallet = parseFloat(user.walletBalance);
    if (amount > wallet) {
      throw new BadRequestException(
        'User no longer has enough wallet balance to approve this stake',
      );
    }

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Stake, stakeId, {
        status: 'APPROVED',
        remainingAmount: stake.amount,
        nextRoiAt: new Date(Date.now() + ROI_INTERVAL_MS),
      });
      await manager.decrement(
        User,
        { id: stake.userId },
        'walletBalance',
        amount,
      );
      await manager.increment(
        User,
        { id: stake.userId },
        'stakedBalance',
        amount,
      );
      await manager.save(WalletTransaction, {
        userId: stake.userId,
        type: 'STAKE',
        status: 'APPROVED',
        amount: stake.amount,
        referenceId: stakeId,
        note: 'Stake approved — moved from wallet to staked balance',
      });
      // Distribute referral commissions atomically inside the same transaction
      await this.distributeCommissionsInManager(
        manager,
        stake.userId,
        stakeId,
        amount,
      );
    });
  }

  async rejectStake(stakeId: string): Promise<void> {
    const stake = await this.stakesRepo.findOne({ where: { id: stakeId } });
    if (!stake) throw new NotFoundException('Stake request not found');
    if (stake.status !== 'PENDING') {
      throw new BadRequestException(
        `Stake is already ${stake.status.toLowerCase()}`,
      );
    }
    await this.stakesRepo.update(stakeId, { status: 'REJECTED' });
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
    const deposit = await this.depositsRepo.findOne({
      where: { id: depositId },
    });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.status !== 'PENDING') {
      throw new BadRequestException(
        `Deposit is already ${deposit.status.toLowerCase()}`,
      );
    }

    const amount = parseFloat(deposit.amount);

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Deposit, depositId, { status: 'APPROVED' });
      await manager.increment(
        User,
        { id: deposit.userId },
        'walletBalance',
        amount,
      );
      await manager.increment(
        User,
        { id: deposit.userId },
        'totalDepositInvestment',
        amount,
      );
      await manager.save(WalletTransaction, {
        userId: deposit.userId,
        type: 'DEPOSIT',
        status: 'APPROVED',
        amount: deposit.amount,
        referenceId: depositId,
        note: 'Deposit approved',
      });
    });
  }

  async rejectDeposit(depositId: string): Promise<void> {
    const deposit = await this.depositsRepo.findOne({
      where: { id: depositId },
    });
    if (!deposit) throw new NotFoundException('Deposit not found');
    if (deposit.status !== 'PENDING') {
      throw new BadRequestException(
        `Deposit is already ${deposit.status.toLowerCase()}`,
      );
    }
    await this.depositsRepo.update(depositId, { status: 'REJECTED' });
  }

  async approveWithdrawal(withdrawalId: string): Promise<void> {
    const withdrawal = await this.withdrawalsRepo.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(
        `Withdrawal is already ${withdrawal.status.toLowerCase()}`,
      );
    }

    const user = await this.usersRepo.findOne({
      where: { id: withdrawal.userId },
    });
    if (!user) throw new NotFoundException('User not found');

    const walletBalance = parseFloat(user.walletBalance);
    const stakedBalance = parseFloat(user.stakedBalance ?? '0');
    const totalWithdrawable = parseFloat(
      (walletBalance + stakedBalance).toFixed(2),
    );
    const amount = parseFloat(withdrawal.amount);
    if (amount > totalWithdrawable) {
      throw new BadRequestException(
        'User has insufficient balance for this withdrawal',
      );
    }

    const walletDebit = Math.min(walletBalance, amount);
    const stakedDebit = parseFloat((amount - walletDebit).toFixed(2));

    await this.dataSource.transaction(async (manager) => {
      await manager.update(Withdrawal, withdrawalId, { status: 'APPROVED' });
      if (walletDebit > 0) {
        await manager.decrement(
          User,
          { id: withdrawal.userId },
          'walletBalance',
          walletDebit,
        );
      }
      if (stakedDebit > 0) {
        await this.consumeStakedPrincipal(
          manager,
          withdrawal.userId,
          stakedDebit,
        );
        await manager.decrement(
          User,
          { id: withdrawal.userId },
          'stakedBalance',
          stakedDebit,
        );
      }
      await manager.save(WalletTransaction, {
        userId: withdrawal.userId,
        type: 'WITHDRAWAL',
        status: 'APPROVED',
        amount: withdrawal.amount,
        referenceId: withdrawalId,
        note: `Withdrawal approved (wallet: ${walletDebit.toFixed(2)}, staked: ${stakedDebit.toFixed(2)})`,
      });
    });
  }

  async rejectWithdrawal(withdrawalId: string): Promise<void> {
    const withdrawal = await this.withdrawalsRepo.findOne({
      where: { id: withdrawalId },
    });
    if (!withdrawal) throw new NotFoundException('Withdrawal not found');
    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException(
        `Withdrawal is already ${withdrawal.status.toLowerCase()}`,
      );
    }
    await this.withdrawalsRepo.update(withdrawalId, { status: 'REJECTED' });
  }

  /**
   * Distributes referral commissions up to 5 levels when a stake is approved.
   *
   * Rules:
   * - Commission is triggered on STAKE, not on deposit.
   * - Upline referrer must have at least one APPROVED deposit to receive commission.
   * - If a level's referrer is ineligible, that level is skipped and traversal continues up.
   * - Uses the open transaction (manager) so the entire stake + commission is one atomic unit.
   * - Idempotent: if commission for this stakeId + level was already paid, it is skipped safely.
   */
  private async distributeCommissionsInManager(
    manager: EntityManager,
    stakerId: string,
    stakeId: string,
    stakeAmount: number,
  ): Promise<void> {
    let currentUserId = stakerId;

    for (const { level, rate, label } of COMMISSION_LEVELS) {
      // Load current node in the upline chain
      const currentUser = await manager.findOne(User, {
        where: { id: currentUserId },
        relations: ['referredBy'],
      });

      // No referrer at this level — chain ends
      if (!currentUser?.referredBy) break;

      const referrer = currentUser.referredBy;

      // Eligibility check: referrer must have made at least one approved deposit
      const referrerHasDeposit = await manager.findOne(Deposit, {
        where: { userId: referrer.id, status: 'APPROVED' },
      });
      if (!referrerHasDeposit) {
        // Skip ineligible level, keep walking up the chain
        currentUserId = referrer.id;
        continue;
      }

      const commission = parseFloat((stakeAmount * rate).toFixed(2));
      if (commission <= 0) {
        currentUserId = referrer.id;
        continue;
      }

      // Idempotency guard: skip if this exact stake+level was already credited
      const alreadyPaid = await manager.findOne(WalletTransaction, {
        where: {
          type: 'COMMISSION',
          referenceId: stakeId,
          level,
          userId: referrer.id,
        },
      });
      if (alreadyPaid) {
        currentUserId = referrer.id;
        continue;
      }

      // Credit commission to referrer's wallet
      await manager.increment(User, { id: referrer.id }, 'walletBalance', commission);
      await manager.save(WalletTransaction, {
        userId: referrer.id,
        type: 'COMMISSION',
        status: 'APPROVED',
        amount: commission.toString(),
        referenceId: stakeId,
        level,
        note: `${label} from referral stake`,
      });

      currentUserId = referrer.id;
    }
  }

  /** Processes stake ROI once each full 24-hour interval from each stake start time. */
  @Cron('*/5 * * * *')
  async runDailyStakeRoi(): Promise<void> {
    const now = new Date();
    const dueStakes = await this.stakesRepo
      .createQueryBuilder('s')
      .select(['s.id', 's.userId', 's.remainingAmount', 's.nextRoiAt'])
      .where('s.status = :status', { status: 'APPROVED' })
      .andWhere('CAST(s.remainingAmount AS DECIMAL(18,2)) > 0')
      .andWhere('s.nextRoiAt IS NOT NULL')
      .andWhere('s.nextRoiAt <= :now', { now })
      .orderBy('s.nextRoiAt', 'ASC')
      .getMany();

    for (const stake of dueStakes) {
      const principal = parseFloat(stake.remainingAmount ?? '0');
      const nextRoiAt = stake.nextRoiAt ? new Date(stake.nextRoiAt) : null;
      if (!nextRoiAt || principal <= 0) continue;

      const elapsedMs = now.getTime() - nextRoiAt.getTime();
      const completedCycles = Math.floor(elapsedMs / ROI_INTERVAL_MS) + 1;
      if (completedCycles <= 0) continue;

      const roiAmount = parseFloat(
        (principal * STAKE_ROI_DAILY_RATE * completedCycles).toFixed(2),
      );
      if (roiAmount <= 0) continue;

      const nextPayoutAt = new Date(
        nextRoiAt.getTime() + completedCycles * ROI_INTERVAL_MS,
      );

      await this.dataSource.transaction(async (manager) => {
        await manager.increment(
          User,
          { id: stake.userId },
          'walletBalance',
          roiAmount,
        );
        await manager.update(
          Stake,
          { id: stake.id },
          {
            nextRoiAt: nextPayoutAt,
          },
        );
        await manager.update(
          User,
          { id: stake.userId },
          { lastStakeRoiAt: now },
        );
        await manager.save(WalletTransaction, {
          userId: stake.userId,
          type: 'STAKE_ROI',
          status: 'APPROVED',
          amount: roiAmount.toString(),
          referenceId: stake.id,
          level: null,
          note:
            completedCycles === 1
              ? 'Stake ROI credited (1.6% after 24 hours)'
              : `Stake ROI catch-up credited for ${completedCycles} cycles`,
        });
      });
    }
  }

  private async consumeStakedPrincipal(
    manager: EntityManager,
    userId: string,
    amountToConsume: number,
  ): Promise<void> {
    let remaining = parseFloat(amountToConsume.toFixed(2));
    if (remaining <= 0) return;

    const approvedStakes = await manager.find(Stake, {
      where: { userId, status: 'APPROVED' },
      order: { createdAt: 'ASC' },
    });

    for (const stake of approvedStakes) {
      if (remaining <= 0) break;
      const principal = parseFloat(stake.remainingAmount ?? '0');
      if (principal <= 0) continue;

      const consume = Math.min(principal, remaining);
      const updatedPrincipal = parseFloat((principal - consume).toFixed(2));
      remaining = parseFloat((remaining - consume).toFixed(2));

      await manager.update(
        Stake,
        { id: stake.id },
        { remainingAmount: updatedPrincipal.toFixed(2) },
      );
    }

    if (remaining > 0) {
      throw new BadRequestException(
        'Stake principal mismatch. Please contact support.',
      );
    }
  }
}
