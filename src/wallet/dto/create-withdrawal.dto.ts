import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, Min, MinLength } from 'class-validator';
import { MIN_WITHDRAWAL } from '../../common/constants/commission.constants';

export class CreateWithdrawalDto {
  @ApiProperty({
    example: 3,
    description: `Amount in USD (min $${MIN_WITHDRAWAL})`,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_WITHDRAWAL, { message: `Minimum withdrawal is $${MIN_WITHDRAWAL}` })
  amount: number;

  @ApiProperty({
    example: 'MySecurePass123',
    description:
      'Withdrawal password (min 8 characters). Must match the password set in Settings.',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
