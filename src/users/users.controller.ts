import {
  Body,
  Controller,
  Get,
  Patch,
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UsersService } from './users.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from './user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('profile')
  @ApiOperation({ summary: 'Get my profile' })
  @ApiResponse({ status: 200, description: 'User profile' })
  getProfile(@CurrentUser() user: User) {
    return this.usersService.getProfile(user.id);
  }

  @Patch('profile')
  @UseInterceptors(FileInterceptor('photo', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Update my profile',
    description:
      'Multipart: optional fullName, paymentAccountNumber, paymentAccountBank, and/or photo (profile image). At least one field required.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        fullName: { type: 'string' },
        paymentAccountNumber: { type: 'string' },
        paymentAccountBank: { type: 'string' },
        photo: { type: 'string', format: 'binary', description: 'New profile photo' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 400, description: 'Nothing to update' })
  updateProfile(
    @CurrentUser() user: User,
    @Body() dto: UpdateProfileDto,
    @UploadedFile() photo: Express.Multer.File | undefined,
  ) {
    return this.usersService.updateProfile(user.id, dto, photo);
  }

  @Get('dashboard-stats')
  @ApiOperation({
    summary: 'Dashboard stats (wallet, team, deposits, withdrawals, income breakdown)',
    description:
      'Single payload for home dashboard: balances, referralCode, direct/total team counts, deposit & withdrawal totals, and income split (direct level-1 commission, levels 2–5, staking ROI).',
  })
  @ApiResponse({ status: 200, description: 'Aggregated stats for current user' })
  getDashboardStats(@CurrentUser() user: User) {
    return this.usersService.getDashboardStats(user.id);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Get my direct referrals (latest first)' })
  @ApiResponse({ status: 200, description: 'Paginated list of direct referrals' })
  getReferrals(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.usersService.getReferrals(user.id, pagination);
  }
}
