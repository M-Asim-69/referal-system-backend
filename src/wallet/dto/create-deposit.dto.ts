import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsString, Min } from 'class-validator';
import { MIN_DEPOSIT } from '../../common/constants/commission.constants';

export class CreateDepositDto {
  @ApiProperty({ example: 5, description: 'Amount in USD (min $5)' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_DEPOSIT, { message: `Minimum deposit is $${MIN_DEPOSIT}` })
  amount: number;

  @ApiProperty({ description: 'Payment proof screenshot URL (required)' })
  @IsString()
  paymentProofUrl: string;
}
