import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './user.entity';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { PaginationDto } from '../common/dto/pagination.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
  ) {}

  async getProfile(userId: string) {
    const user = await this.findOrFail(userId);
    return { message: 'Profile fetched successfully', data: this.sanitize(user) };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.findOrFail(userId);
    Object.assign(user, dto);
    const updated = await this.usersRepo.save(user);
    return { message: 'Profile updated successfully', data: this.sanitize(updated) };
  }

  async getReferrals(userId: string, pagination: PaginationDto) {
    const { page, limit } = pagination;
    const [data, total] = await this.usersRepo.findAndCount({
      where: { referredById: userId },
      select: ['id', 'fullName', 'email', 'status', 'createdAt', 'referralCode'],
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
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
