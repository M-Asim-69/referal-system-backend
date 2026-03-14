import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsPositive } from 'class-validator';

export class CreateWithdrawalDto {
  @ApiProperty({ example: 1000, description: 'Amount to withdraw' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;
}
