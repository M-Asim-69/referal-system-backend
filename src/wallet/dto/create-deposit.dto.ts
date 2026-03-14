import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive, IsString } from 'class-validator';

export class CreateDepositDto {
  @ApiProperty({ example: 5000, description: 'Amount to deposit' })
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...', description: 'Payment proof screenshot URL' })
  @IsOptional()
  @IsString()
  paymentProofUrl?: string;
}
