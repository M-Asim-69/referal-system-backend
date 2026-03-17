import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
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
import { WalletService } from './wallet.service';
import { CreateDepositDto } from './dto/create-deposit.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { User } from '../users/user.entity';
import { PaginationDto } from '../common/dto/pagination.dto';

@ApiTags('Wallet')
@ApiBearerAuth()
@Controller('wallet')
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('balance')
  @ApiOperation({ summary: 'Get my wallet balance', description: 'Returns balance in USD.' })
  @ApiResponse({ status: 200, description: 'balance, currency (USD)' })
  getBalance(@CurrentUser() user: User) {
    return this.walletService.getBalance(user.id);
  }

  @Get('transactions')
  @ApiOperation({ summary: 'Get my wallet transaction history' })
  @ApiResponse({ status: 200, description: 'Paginated transaction history (deposits, withdrawals, commissions)' })
  getTransactions(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.walletService.getTransactions(user.id, pagination);
  }

  @Post('deposits')
  @HttpCode(HttpStatus.CREATED)
  @UseInterceptors(FileInterceptor('screenshot', { storage: memoryStorage() }))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Submit deposit (min $5 + proof)',
    description:
      'amount ≥ 5 (USD) + screenshot file (field name: screenshot). Manual approval; wait up to 24h. On approve: amount is credited and referral level commissions are applied.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', format: 'float', example: 5 },
        screenshot: { type: 'string', format: 'binary' },
      },
      required: ['amount', 'screenshot'],
    },
  })
  @ApiResponse({ status: 201, description: 'Deposit submitted; wait up to 24h for approval' })
  @ApiResponse({ status: 400, description: 'Min $5, proof required, or account not active' })
  createDeposit(
    @CurrentUser() user: User,
    @Body() dto: CreateDepositDto,
    @UploadedFile() screenshot: Express.Multer.File,
  ) {
    return this.walletService.createDeposit(user.id, dto, screenshot);
  }

  @Get('deposits')
  @ApiOperation({ summary: 'Get my deposit history' })
  @ApiResponse({ status: 200, description: 'Paginated deposit history' })
  getDeposits(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.walletService.getDeposits(user.id, pagination);
  }

  @Post('withdrawals')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Submit withdrawal (min $3)',
    description: 'amount ≥ 3 (USD). Manual approval by admin.',
  })
  @ApiResponse({ status: 201, description: 'Withdrawal submitted; pending admin approval' })
  @ApiResponse({ status: 400, description: 'Min $3, insufficient balance, or existing pending withdrawal' })
  createWithdrawal(@CurrentUser() user: User, @Body() dto: CreateWithdrawalDto) {
    return this.walletService.createWithdrawal(user.id, dto);
  }

  @Get('withdrawals')
  @ApiOperation({ summary: 'Get my withdrawal history' })
  @ApiResponse({ status: 200, description: 'Paginated withdrawal history' })
  getWithdrawals(@CurrentUser() user: User, @Query() pagination: PaginationDto) {
    return this.walletService.getWithdrawals(user.id, pagination);
  }
}
