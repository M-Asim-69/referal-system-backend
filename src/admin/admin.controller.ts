import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { Roles } from '../common/decorators/roles.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { UserStatus } from '../users/user.entity';

@ApiTags('Admin')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get platform statistics overview' })
  @ApiResponse({ status: 200, description: 'Dashboard stats' })
  getDashboard() {
    return this.adminService.getDashboard();
  }

  @Get('users')
  @ApiOperation({ summary: 'List all users with optional status filter' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'ACTIVE', 'REJECTED'] })
  @ApiResponse({ status: 200, description: 'Paginated user list' })
  getUsers(@Query() pagination: PaginationDto, @Query('status') status?: UserStatus) {
    return this.adminService.getUsers(pagination, status);
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get full user details with referrals and deposit history' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User details' })
  @ApiResponse({ status: 404, description: 'User not found' })
  getUserById(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.getUserById(id);
  }

  @Patch('users/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending user (credits initial deposit + distributes commissions)' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User approved, commissions distributed' })
  @ApiResponse({ status: 400, description: 'User not in pending state' })
  @ApiResponse({ status: 404, description: 'User not found' })
  approveUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.approveUser(id);
  }

  @Delete('users/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Delete user permanently',
    description:
      'Removes user, deposits, withdrawals, transactions. Same email can register again via POST /auth/register. ADMIN users cannot be deleted here.',
  })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User deleted' })
  @ApiResponse({ status: 400, description: 'Cannot delete admin' })
  @ApiResponse({ status: 404, description: 'User not found' })
  deleteUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.deleteUser(id);
  }

  @Patch('users/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending user account' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'User rejected' })
  @ApiResponse({ status: 400, description: 'User not in pending state' })
  @ApiResponse({ status: 404, description: 'User not found' })
  rejectUser(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.rejectUser(id);
  }

  @Get('deposits')
  @ApiOperation({ summary: 'List all deposit requests with optional status filter' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiResponse({ status: 200, description: 'Paginated deposit list' })
  getAllDeposits(@Query() pagination: PaginationDto, @Query('status') status?: string) {
    return this.adminService.getAllDeposits(pagination, status);
  }

  @Patch('deposits/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending deposit and credit user wallet' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Deposit approved, wallet credited' })
  @ApiResponse({ status: 400, description: 'Deposit not in pending state' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  approveDeposit(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.approveDeposit(id);
  }

  @Patch('deposits/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending deposit' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Deposit rejected' })
  @ApiResponse({ status: 404, description: 'Deposit not found' })
  rejectDeposit(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.rejectDeposit(id);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'List all withdrawal requests with optional status filter' })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'APPROVED', 'REJECTED'] })
  @ApiResponse({ status: 200, description: 'Paginated withdrawal list' })
  getAllWithdrawals(@Query() pagination: PaginationDto, @Query('status') status?: string) {
    return this.adminService.getAllWithdrawals(pagination, status);
  }

  @Patch('withdrawals/:id/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve a pending withdrawal and deduct from user wallet' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Withdrawal approved, wallet debited' })
  @ApiResponse({ status: 400, description: 'Insufficient balance or not in pending state' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  approveWithdrawal(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.approveWithdrawal(id);
  }

  @Patch('withdrawals/:id/reject')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reject a pending withdrawal request' })
  @ApiParam({ name: 'id', type: 'string', format: 'uuid' })
  @ApiResponse({ status: 200, description: 'Withdrawal rejected' })
  @ApiResponse({ status: 404, description: 'Withdrawal not found' })
  rejectWithdrawal(@Param('id', ParseUUIDPipe) id: string) {
    return this.adminService.rejectWithdrawal(id);
  }
}
