import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class SetWithdrawPasswordDto {
  @ApiProperty({
    example: 'MySecurePass123',
    description: 'Minimum 8 characters',
  })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;
}
