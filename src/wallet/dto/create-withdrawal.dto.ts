import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { MIN_WITHDRAWAL } from '../../common/constants/commission.constants';

export class CreateWithdrawalDto {
  @ApiProperty({
    example: 3,
    description: `Amount in USD (min $${MIN_WITHDRAWAL})`,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_WITHDRAWAL, { message: `Minimum withdrawal is $${MIN_WITHDRAWAL}` })
  amount: number;
}
