import {
  Body,
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthService } from './auth.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterUserDto } from './dto/register-user.dto';
import { LoginDto } from './dto/login.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('profilePhoto', { storage: memoryStorage() }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Register user (multipart)',
    description:
      'Fields: username, email, password, fullName; optional mobile, referralCode, profilePhoto (image). User is ACTIVE; deposit min $5 with proof after login.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['username', 'email', 'password', 'fullName'],
      properties: {
        username: { type: 'string', example: 'johndoe' },
        email: { type: 'string', example: 'user@example.com' },
        password: { type: 'string', example: 'Secret1a' },
        fullName: { type: 'string', example: 'John Doe' },
        mobile: { type: 'string', example: '03001234567' },
        referralCode: { type: 'string' },
        profilePhoto: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile image',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'User created; can login and deposit',
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid referral code',
  })
  @ApiResponse({
    status: 409,
    description: 'Email or username already registered',
  })
  register(
    @Body() dto: RegisterUserDto,
    @UploadedFile() profilePhoto: Express.Multer.File | undefined,
  ) {
    return this.authService.registerUser(dto, profilePhoto);
  }

  @Public()
  @Post('register-admin')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(
    FileInterceptor('profilePhoto', { storage: memoryStorage() }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiHeader({
    name: 'x-admin-register-secret',
    required: true,
    description:
      'Must match **ADMIN_REGISTER_SECRET** in server `.env`. Without it, returns 403.',
    schema: { type: 'string', example: 'change-this-secret' },
  })
  @ApiOperation({
    summary: 'Register admin (multipart)',
    description: `
Creates an **ADMIN** user with status **ACTIVE**.  
Fields: email, password; optional fullName, profilePhoto.

**Security:** Protected by header \`x-admin-register-secret\`. Set a strong \`ADMIN_REGISTER_SECRET\` in production.
    `.trim(),
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['email', 'password'],
      properties: {
        email: { type: 'string' },
        password: { type: 'string' },
        fullName: { type: 'string' },
        profilePhoto: {
          type: 'string',
          format: 'binary',
          description: 'Optional profile image',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Admin user created' })
  @ApiResponse({
    status: 403,
    description: 'Invalid or missing admin registration secret',
  })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  registerAdmin(
    @Body() dto: RegisterAdminDto,
    @Headers('x-admin-register-secret') secret: string,
    @UploadedFile() profilePhoto: Express.Multer.File | undefined,
  ) {
    return this.authService.registerAdmin(dto, secret, profilePhoto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login',
    description:
      'Email + password. Returns JWT for protected routes. REJECTED accounts cannot login.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({
    status: 200,
    description:
      'accessToken, referralCode (top-level + inside user), and user payload',
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or rejected account',
  })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Current user profile',
    description:
      'Returns user with referralCode, username, email, fullName, mobile, walletBalance (USD).',
  })
  @ApiResponse({ status: 200, description: 'User (no passwordHash)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }
}
