import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User } from '../users/user.entity';
import { Deposit } from '../wallet/deposit.entity';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { FilesService } from '../files/files.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Deposit)
    private readonly depositsRepo: Repository<Deposit>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly filesService: FilesService,
  ) {}

  /**
   * Admin register: email + password only. Guarded by ADMIN_REGISTER_SECRET.
   */
  async registerAdmin(
    dto: RegisterAdminDto,
    secretHeader: string | undefined,
    profilePhoto: Express.Multer.File | undefined,
  ) {
    const expected = this.configService.get<string>('adminRegisterSecret');
    if (!expected || secretHeader !== expected) {
      throw new ForbiddenException('Invalid or missing admin registration secret');
    }

    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const referralCode = this.generateReferralCode();

    let profileImageUrl: string | null = null;
    if (profilePhoto?.buffer?.length) {
      const upload = await this.filesService.uploadImage(profilePhoto, 'profiles');
      profileImageUrl = upload.data.url;
    }

    const user = this.usersRepo.create({
      username: dto.email,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName?.trim() || 'Administrator',
      referralCode,
      referredById: null,
      paymentAccountNumber: null,
      paymentAccountBank: null,
      profileImageUrl,
      status: 'ACTIVE',
      role: 'ADMIN',
    });

    const savedUser = await this.usersRepo.save(user);
    return {
      message: 'Admin registered successfully',
      data: this.sanitizeUser(savedUser),
    };
  }

  /**
   * User register: multipart/form-data (same fields as before + optional profilePhoto file).
   * User is ACTIVE; can login and deposit (min $5 + proof).
   */
  async registerUser(dto: RegisterUserDto, profilePhoto: Express.Multer.File | undefined) {
    const existingEmail = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existingEmail) throw new ConflictException('Email is already registered');
    const existingUsername = await this.usersRepo.findOne({ where: { username: dto.username } });
    if (existingUsername) throw new ConflictException('Username is already taken');

    let referrer: User | null = null;
    if (dto.referralCode) {
      referrer = await this.usersRepo.findOne({ where: { referralCode: dto.referralCode } });
      if (!referrer) throw new BadRequestException('Invalid referral code');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const referralCode = this.generateReferralCode();

    let profileImageUrl: string | null = null;
    if (profilePhoto?.buffer?.length) {
      const upload = await this.filesService.uploadImage(profilePhoto, 'profiles');
      profileImageUrl = upload.data.url;
    }

    const user = this.usersRepo.create({
      username: dto.username,
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      mobile: dto.mobile ?? null,
      referralCode,
      referredById: referrer?.id ?? null,
      profileImageUrl,
      status: 'ACTIVE',
      role: 'USER',
    });

    const savedUser = await this.usersRepo.save(user);
    return {
      message: 'Registration successful. You can login and make a deposit (min $5 with payment proof).',
      data: this.sanitizeUser(savedUser),
    };
  }

  async login(dto: LoginDto) {
    const user = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (!user) throw new UnauthorizedException('Invalid email or password');

    const isPasswordValid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isPasswordValid) throw new UnauthorizedException('Invalid email or password');

    if (user.status === 'REJECTED') {
      throw new UnauthorizedException('Your account has been rejected. Please contact support.');
    }

    const withReferral = await this.ensureReferralCode(user);

    const token = this.jwtService.sign({
      sub: withReferral.id,
      email: withReferral.email,
      role: withReferral.role,
    });

    return {
      message: 'Login successful',
      data: {
        accessToken: token,
        tokenType: 'Bearer',
        referralCode: withReferral.referralCode,
        user: this.sanitizeUser(withReferral),
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    const withReferral = await this.ensureReferralCode(user);
    return { message: 'Profile fetched', data: this.sanitizeUser(withReferral) };
  }

  /** Ensures every account has a unique referral code (signup generates one; this backfills edge cases). */
  private async ensureReferralCode(user: User): Promise<User> {
    if (user.referralCode?.trim()) {
      return user;
    }
    for (let attempt = 0; attempt < 24; attempt++) {
      const code = this.generateReferralCode();
      const clash = await this.usersRepo.findOne({ where: { referralCode: code } });
      if (!clash) {
        await this.usersRepo.update(user.id, { referralCode: code });
        user.referralCode = code;
        return user;
      }
    }
    throw new InternalServerErrorException('Could not assign referral code');
  }

  private generateReferralCode(): string {
    return randomBytes(4).toString('hex').toUpperCase();
  }

  private sanitizeUser(user: User) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, ...safe } = user;
    return safe;
  }
}
