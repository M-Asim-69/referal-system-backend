import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { User } from '../users/user.entity';
import { Deposit } from '../wallet/deposit.entity';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterUserMultipartDto } from './dto/register-user-multipart.dto';
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
    private readonly filesService: FilesService,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Admin register: email + password only. Guarded by ADMIN_REGISTER_SECRET.
   */
  async registerAdmin(dto: RegisterAdminDto, secretHeader?: string) {
    const expected = this.configService.get<string>('adminRegisterSecret');
    if (!expected || secretHeader !== expected) {
      throw new ForbiddenException('Invalid or missing admin registration secret');
    }

    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email is already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const referralCode = this.generateReferralCode();

    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName?.trim() || 'Administrator',
      referralCode,
      referredById: null,
      paymentAccountNumber: null,
      paymentAccountBank: null,
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
   * User register: multipart screenshot → Cloudinary → deposit.paymentProofUrl.
   * No bank name / account / amount in body; request stays PENDING for admin.
   */
  async registerWithScreenshot(
    file: Express.Multer.File | undefined,
    body: Record<string, string>,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('Screenshot file is required (field name: screenshot)');
    }

    const dto = plainToInstance(RegisterUserMultipartDto, {
      email: body.email,
      password: body.password,
      fullName: body.fullName,
      referralCode: body.referralCode || undefined,
    });
    const errors = await validate(dto);
    if (errors.length > 0) {
      const msg = errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('; ');
      throw new BadRequestException(msg || 'Validation failed');
    }

    const existing = await this.usersRepo.findOne({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email is already registered');

    let referrer: User | null = null;
    if (dto.referralCode) {
      referrer = await this.usersRepo.findOne({ where: { referralCode: dto.referralCode } });
      if (!referrer) throw new BadRequestException('Invalid referral code');
      if (referrer.status !== 'ACTIVE') {
        throw new BadRequestException('Referral code belongs to an inactive account');
      }
    }

    const upload = await this.filesService.uploadImage(file, 'registrations');
    const paymentProofUrl = upload.data.url;

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const referralCode = this.generateReferralCode();

    const user = this.usersRepo.create({
      email: dto.email,
      passwordHash,
      fullName: dto.fullName,
      referralCode,
      referredById: referrer?.id ?? null,
      paymentAccountNumber: null,
      paymentAccountBank: null,
      profileImageUrl: paymentProofUrl, // same Cloudinary URL — DB mein profileImageUrl bhi fill
      status: 'PENDING',
      role: 'USER',
    });

    const savedUser = await this.usersRepo.save(user);

    // INITIAL deposit: amount 0 until admin sets amount on approve or separate flow;
    // proof URL is the screenshot for admin review.
    await this.depositsRepo.save(
      this.depositsRepo.create({
        userId: savedUser.id,
        amount: '0',
        kind: 'INITIAL',
        status: 'PENDING',
        paymentProofUrl,
      }),
    );

    return {
      message:
        'Registration successful. Screenshot received; your account is pending admin approval.',
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

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      message: 'Login successful',
      data: {
        accessToken: token,
        tokenType: 'Bearer',
        user: this.sanitizeUser(user),
      },
    };
  }

  async getMe(userId: string) {
    const user = await this.usersRepo.findOne({ where: { id: userId } });
    if (!user) throw new UnauthorizedException('User not found');
    return { message: 'Profile fetched', data: this.sanitizeUser(user) };
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
