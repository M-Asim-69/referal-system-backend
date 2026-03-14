import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/user.entity';
import { Deposit } from '../wallet/deposit.entity';
import { Withdrawal } from '../wallet/withdrawal.entity';
import { WalletTransaction } from '../wallet/wallet-transaction.entity';
import { WalletService } from '../wallet/wallet.service';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Deposit)
    private readonly depositsRepo: Repository<Deposit>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalsRepo: Repository<Withdrawal>,
    private readonly walletService: WalletService,
  ) {}

  async getDashboard() {
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      totalDeposits,
      pendingDeposits,
      totalWithdrawals,
      pendingWithdrawals,
    ] = await Promise.all([
      this.usersRepo.count({ where: { role: 'USER' } }),
      this.usersRepo.count({ where: { role: 'USER', status: 'ACTIVE' } }),
      this.usersRepo.count({ where: { role: 'USER', status: 'PENDING' } }),
      this.depositsRepo.count(),
      this.depositsRepo.count({ where: { status: 'PENDING' } }),
      this.withdrawalsRepo.count(),
      this.withdrawalsRepo.count({ where: { status: 'PENDING' } }),
    ]);

    return {
      message: 'Dashboard stats fetched',
      data: {
        users: { total: totalUsers, active: activeUsers, pending: pendingUsers },
        deposits: { total: totalDeposits, pending: pendingDeposits },
        withdrawals: { total: totalWithdrawals, pending: pendingWithdrawals },
      },
    };
  }

  async getUsers(pagination: PaginationDto, status?: UserStatus) {
    const { page, limit } = pagination;
    const where: Partial<{ role: 'USER'; status: UserStatus }> = { role: 'USER' };
    if (status) where.status = status;

    const [data, total] = await this.usersRepo.findAndCount({
      where,
      select: [
        'id', 'email', 'fullName', 'role', 'status',
        'referralCode', 'referredById', 'walletBalance',
        'paymentAccountNumber', 'paymentAccountBank',
        'profileImageUrl', 'createdAt', 'updatedAt',
      ],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      message: 'Users fetched successfully',
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getUserById(id: string) {
    const user = await this.usersRepo.findOne({
      where: { id },
      relations: ['referredBy', 'directReferrals'],
      select: {
        id: true, email: true, fullName: true, role: true, status: true,
        referralCode: true, referredById: true, walletBalance: true,
        paymentAccountNumber: true, paymentAccountBank: true,
        profileImageUrl: true, createdAt: true, updatedAt: true,
        referredBy: { id: true, fullName: true, email: true },
        directReferrals: { id: true, fullName: true, email: true, status: true },
      },
    });
    if (!user) throw new NotFoundException('User not found');

    const deposits = await this.depositsRepo.find({ where: { userId: id }, order: { createdAt: 'DESC' } });

    return {
      message: 'User details fetched',
      data: { ...user, deposits },
    };
  }

  async approveUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'PENDING') {
      throw new BadRequestException(`User is already ${user.status.toLowerCase()}`);
    }

    const initialDeposit = await this.depositsRepo.findOne({
      where: { userId, kind: 'INITIAL', status: 'PENDING' },
    });

    await this.usersRepo.update(userId, { status: 'ACTIVE' });

    if (initialDeposit) {
      const amount = parseFloat(initialDeposit.amount);
      if (amount > 0) {
        await this.walletService.approveDeposit(initialDeposit.id);
        await this.walletService.distributeCommissions(userId, amount);
        return {
          message:
            'User approved. Initial deposit credited and commissions distributed.',
        };
      }
      // Screenshot-only registration: amount 0 until admin sets amount elsewhere
      await this.depositsRepo.update(initialDeposit.id, { status: 'APPROVED' });
      return {
        message:
          'User approved. No deposit amount on file (screenshot only); wallet unchanged.',
      };
    }

    return { message: 'User approved successfully.' };
  }

  async rejectUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.status !== 'PENDING') {
      throw new BadRequestException(`User is already ${user.status.toLowerCase()}`);
    }
    await this.usersRepo.update(userId, { status: 'REJECTED' });
    return { message: 'User rejected successfully' };
  }

  /**
   * Hard delete user + related rows so the same email can register again via POST /auth/register.
   * Does not delete ADMIN users (use DB manually if needed).
   */
  async deleteUser(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new NotFoundException('User not found');
    if (user.role === 'ADMIN') {
      throw new BadRequestException('Cannot delete admin user via API');
    }

    await this.usersRepo.manager.transaction(async (manager) => {
      await manager.delete(WalletTransaction, { userId });
      await manager.delete(Withdrawal, { userId });
      await manager.delete(Deposit, { userId });
      await manager.update(User, { referredById: userId }, { referredById: null });
      await manager.delete(User, userId);
    });

    return {
      message:
        'User deleted. Same email can register again via POST /auth/register (multipart).',
    };
  }

  async getAllDeposits(pagination: PaginationDto, status?: string) {
    const { page, limit } = pagination;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [data, total] = await this.depositsRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const safeData = data.map((d) => {
      if (d.user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = d.user as User & { passwordHash: string };
        return { ...d, user: safeUser };
      }
      return d;
    });

    return {
      message: 'Deposits fetched successfully',
      data: safeData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveDeposit(depositId: string) {
    await this.walletService.approveDeposit(depositId);
    return { message: 'Deposit approved and wallet credited' };
  }

  async rejectDeposit(depositId: string) {
    await this.walletService.rejectDeposit(depositId);
    return { message: 'Deposit rejected' };
  }

  async getAllWithdrawals(pagination: PaginationDto, status?: string) {
    const { page, limit } = pagination;
    const where: Record<string, unknown> = {};
    if (status) where.status = status;

    const [data, total] = await this.withdrawalsRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    const safeData = data.map((w) => {
      if (w.user) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { passwordHash, ...safeUser } = w.user as User & { passwordHash: string };
        return { ...w, user: safeUser };
      }
      return w;
    });

    return {
      message: 'Withdrawals fetched successfully',
      data: safeData,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async approveWithdrawal(withdrawalId: string) {
    await this.walletService.approveWithdrawal(withdrawalId);
    return { message: 'Withdrawal approved and wallet debited' };
  }

  async rejectWithdrawal(withdrawalId: string) {
    await this.walletService.rejectWithdrawal(withdrawalId);
    return { message: 'Withdrawal rejected' };
  }
}
