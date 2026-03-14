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
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiHeader,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterAdminDto } from './dto/register-admin.dto';
import { RegisterMultipartSwaggerDto } from './dto/register-multipart.swagger.dto';
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
    FileInterceptor('screenshot', { storage: memoryStorage() }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Register user (multipart + screenshot)',
    description: `
**Multipart form only** — not JSON.

- **screenshot** (file, required): payment proof image → uploaded to **Cloudinary**; URL stored in \`deposits.paymentProofUrl\` for admin.
- **No** \`initialDepositAmount\`, \`paymentAccountNumber\`, or \`paymentAccountBank\` — replaced by the screenshot.
- Account is created as **PENDING**; admin approves via \`/admin/users/:id/approve\`.
    `.trim(),
  })
  @ApiBody({
    description:
      'Form fields + file. Field name for file must be exactly **screenshot**.',
    type: RegisterMultipartSwaggerDto,
  })
  @ApiResponse({
    status: 201,
    description: 'User created; pending admin approval. Screenshot URL stored on INITIAL deposit.',
  })
  @ApiResponse({ status: 400, description: 'Missing screenshot or validation error' })
  @ApiResponse({ status: 409, description: 'Email already registered' })
  register(
    @UploadedFile() screenshot: Express.Multer.File,
    @Body() body: Record<string, string>,
  ) {
    return this.authService.registerWithScreenshot(screenshot, body);
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
