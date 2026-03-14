import { Body, Controller, Get, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Update my profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  updateProfile(@CurrentUser() user: User, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @Get('referrals')
  @ApiOperation({ summary: 'Get my direct referrals' })
  @ApiResponse({ status: 200, description: 'Paginated list of direct referrals' })
  getReferrals(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.usersService.getReferrals(user.id, pagination);
  }
}
