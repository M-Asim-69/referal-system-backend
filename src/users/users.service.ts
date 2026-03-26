import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { FilesService } from '../files/files.service';
import { WalletTransaction } from '../wallet/wallet-transaction.entity';
import { Withdrawal } from '../wallet/withdrawal.entity';
import { APP_CURRENCY } from '../common/constants/commission.constants';
import bcrypt from 'bcryptjs';

export interface UserDashboardStats {
  currency: string;
  walletBalance: number;
  stakedBalance: number;
  referralCode: string;
  directTeam: number;
  totalTeam: number;
  totalTeamBusiness: number;
  depositAmount: number;
  withdrawalAmount: number;
  directIncome: number;
  levelsIncome: number;
  stakingIncome: number;
  totalIncome: number;
}

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(WalletTransaction)
    private readonly txRepo: Repository<WalletTransaction>,
    @InjectRepository(Withdrawal)
    private readonly withdrawalsRepo: Repository<Withdrawal>,
    private readonly filesService: FilesService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.findOrFail(userId);
    return {
      message: 'Profile fetched successfully',
      data: this.sanitize(user),
    };
  }

  async updateProfile(
    userId: string,
    dto: UpdateProfileDto,
    photo: Express.Multer.File | undefined,
  ) {
    const user = await this.findOrFail(userId);

    const hasTextUpdate =
      dto.fullName !== undefined ||
      dto.paymentAccountNumber !== undefined ||
      dto.paymentAccountBank !== undefined;
    const hasPhoto = Boolean(photo?.buffer?.length);

    if (!hasTextUpdate && !hasPhoto) {
      throw new BadRequestException(
        'Send at least one of: fullName, paymentAccountNumber, paymentAccountBank, or photo (image file).',
      );
    }

    if (dto.fullName !== undefined) user.fullName = dto.fullName;
    if (dto.paymentAccountNumber !== undefined) {
      user.paymentAccountNumber = dto.paymentAccountNumber;
    }
    if (dto.paymentAccountBank !== undefined) {
      user.paymentAccountBank = dto.paymentAccountBank;
    }
    if (hasPhoto) {
      const upload = await this.filesService.uploadImage(photo!, 'profiles');
      user.profileImageUrl = upload.data.url;
    }

    const updated = await this.usersRepo.save(user);
    return {
      message: 'Profile updated successfully',
      data: this.sanitize(updated),
    };
  }

  async getDashboardStats(
    userId: string,
  ): Promise<{ message: string; data: UserDashboardStats }> {
    const user = await this.usersRepo.findOne({
      where: { id: userId },
      select: [
        'id',
        'walletBalance',
        'stakedBalance',
        'totalDepositInvestment',
        'referralCode',
      ],
    });
    if (!user) throw new NotFoundException('User not found');

    const [
      directTeam,
      totalTeam,
      totalTeamBusiness,
      withdrawalRow,
      stakeRoiRow,
      dirCommRow,
      lvlCommRow,
    ] = await Promise.all([
      this.usersRepo.count({ where: { referredById: userId } }),
      this.countTotalDownline(userId),
      this.getTotalTeamBusiness(userId),
      this.withdrawalsRepo
        .createQueryBuilder('w')
        .select('COALESCE(SUM(w.amount), 0)', 'sum')
        .where('w.userId = :uid', { uid: userId })
        .andWhere('w.status = :st', { st: 'APPROVED' })
        .getRawOne<{ sum: string }>(),
      this.txRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'sum')
        .where('t.userId = :uid', { uid: userId })
        .andWhere('t.type = :ty', { ty: 'STAKE_ROI' })
        .andWhere('t.status = :st', { st: 'APPROVED' })
        .getRawOne<{ sum: string }>(),
      this.txRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'sum')
        .where('t.userId = :uid', { uid: userId })
        .andWhere('t.type = :ty', { ty: 'COMMISSION' })
        .andWhere('t.status = :st', { st: 'APPROVED' })
        .andWhere('t.level = :lv', { lv: 1 })
        .getRawOne<{ sum: string }>(),
      this.txRepo
        .createQueryBuilder('t')
        .select('COALESCE(SUM(t.amount), 0)', 'sum')
        .where('t.userId = :uid', { uid: userId })
        .andWhere('t.type = :ty', { ty: 'COMMISSION' })
        .andWhere('t.status = :st', { st: 'APPROVED' })
        .andWhere('t.level > 1')
        .getRawOne<{ sum: string }>(),
    ]);

    const stakingIncome = parseFloat(stakeRoiRow?.sum ?? '0');
    const directIncome = parseFloat(dirCommRow?.sum ?? '0');
    const levelsIncome = parseFloat(lvlCommRow?.sum ?? '0');
    const withdrawalAmount = parseFloat(withdrawalRow?.sum ?? '0');
    const totalIncome = directIncome + levelsIncome + stakingIncome;

    return {
      message: 'Dashboard stats fetched successfully',
      data: {
        currency: APP_CURRENCY,
        walletBalance: parseFloat(user.walletBalance),
        stakedBalance: parseFloat(user.stakedBalance ?? '0'),
        referralCode: user.referralCode,
        directTeam,
        totalTeam,
        totalTeamBusiness,
        depositAmount: parseFloat(user.totalDepositInvestment),
        withdrawalAmount,
        directIncome,
        levelsIncome,
        stakingIncome,
        totalIncome,
      },
    };
  }

  /** All descendants in referral tree (excludes self; not only direct). */
  private async countTotalDownline(rootUserId: string): Promise<number> {
    const rows = await this.usersRepo.query(
      `
      WITH RECURSIVE downline AS (
        SELECT id FROM users WHERE "referredById" = $1
        UNION ALL
        SELECT u.id FROM users u
        INNER JOIN downline d ON u."referredById" = d.id
      )
      SELECT COUNT(*)::int AS cnt FROM downline
      `,
      [rootUserId],
    );
    const n = rows[0]?.cnt;
    return typeof n === 'number' ? n : parseInt(String(n ?? 0), 10) || 0;
  }

  /** Sum of APPROVED deposits made by all descendants in referral tree. */
  private async getTotalTeamBusiness(rootUserId: string): Promise<number> {
    const rows = await this.usersRepo.query(
      `
      WITH RECURSIVE downline AS (
        SELECT id FROM users WHERE "referredById" = $1
        UNION ALL
        SELECT u.id FROM users u
        INNER JOIN downline d ON u."referredById" = d.id
      )
      SELECT COALESCE(SUM(d.amount), 0)::numeric AS total
      FROM deposits d
      INNER JOIN downline dl ON dl.id = d."userId"
      WHERE d.status = 'APPROVED'
      `,
      [rootUserId],
    );

    const total = rows[0]?.total;
    return parseFloat(String(total ?? 0));
  }

  async getReferrals(userId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.usersRepo.findAndCount({
      where: { referredById: userId },
      select: [
        'id',
        'username',
        'fullName',
        'email',
        'status',
        'createdAt',
        'referralCode',
      ],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      message: 'Referrals fetched successfully',
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findById(id: string): Promise<User> {
    return this.findOrFail(id);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersRepo.findOne({ where: { email } });
  }

  private async findOrFail(id: string): Promise<User> {
    const user = await this.usersRepo.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  sanitize(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, withdrawPasswordHash, ...safe } = user;
    return safe;
  }

  async setWithdrawPassword(userId: string, password: string) {
    const user = await this.findOrFail(userId);
    const hash = await bcrypt.hash(password, 12);
    user.withdrawPasswordHash = hash;
    await this.usersRepo.save(user);
    return { message: 'Withdrawal password set successfully' };
  }
}
