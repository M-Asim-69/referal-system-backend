import { Body, Controller, Get, Headers, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiHeader, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
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
  @ApiOperation({
    summary: 'Register user (JSON)',
    description: 'Username (lowercase+numbers), email, password, fullName. Optional: mobile, referralCode. No confirm password. User is ACTIVE; deposit min $5 with proof after login.',
  })
  @ApiBody({ type: RegisterUserDto })
  @ApiResponse({ status: 201, description: 'User created; can login and deposit' })
  @ApiResponse({ status: 400, description: 'Validation error or invalid referral code' })
  @ApiResponse({ status: 409, description: 'Email or username already registered' })
  register(@Body() dto: RegisterUserDto) {
    return this.authService.registerUser(dto);
  }

  @Public()
  @Post('register-admin')
  @HttpCode(HttpStatus.CREATED)
  @ApiHeader({
    name: 'x-admin-register-secret',
    required: true,
    description:
      'Must match **ADMIN_REGISTER_SECRET** in server `.env`. Without it, returns 403.',
    schema: { type: 'string', example: 'change-this-secret' },
  })
  @ApiOperation({
    summary: 'Register admin (email + password only)',
    description: `
Creates an **ADMIN** user with status **ACTIVE**.  
No bank/deposit fields.

**Security:** Protected by header \`x-admin-register-secret\`. Set a strong \`ADMIN_REGISTER_SECRET\` in production.
    `.trim(),
  })
  @ApiBody({ type: RegisterAdminDto })
  @ApiResponse({ status: 201, description: 'Admin user created' })
  @ApiResponse({ status: 403, description: 'Invalid or missing admin registration secret' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  registerAdmin(
    @Body() dto: RegisterAdminDto,
    @Headers('x-admin-register-secret') secret: string,
  ) {
    return this.authService.registerAdmin(dto, secret);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Login', description: 'Returns JWT. PENDING users can login but have limited access until approved.' })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'accessToken + user payload' })
  @ApiResponse({ status: 401, description: 'Invalid credentials or rejected account' })
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Current user profile' })
  @ApiResponse({ status: 200, description: 'Sanitized user (no passwordHash)' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMe(@CurrentUser() user: User) {
    return this.authService.getMe(user.id);
  }
}
