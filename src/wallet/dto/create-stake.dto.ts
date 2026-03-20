import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import { MIN_STAKE } from '../../common/constants/commission.constants';

export class CreateStakeDto {
  @ApiProperty({
    example: 10,
    description: `Amount from wallet to lock as stake (min $${MIN_STAKE}). Admin must approve.`,
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(MIN_STAKE, { message: `Minimum stake is $${MIN_STAKE}` })
  amount: number;
}
