import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class RegisterUserDto {
  @ApiProperty({
    example: 'Asim',
    description: 'Username (min 5 chars, max 50). Any letters/numbers allowed.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(50)
  username: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: '+923001234567',
    description: 'Mobile number (optional). Max 14 digits (optionally starts with +).',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(14)
  @Matches(/^\+?[0-9]{1,14}$/, {
    message: 'Mobile must be digits (optionally starting with +) with max 14 characters',
  })
  mobile?: string;

  @ApiProperty({
    minLength: 8,
    maxLength: 8,
    description: 'Password length must be exactly 8 characters (min/max = 8). Any characters allowed.',
  })
  @IsString()
  @MinLength(8)
  @MaxLength(8)
  password: string;

  @ApiProperty({
    description: 'Full name (min 5 chars, max 100). Any text allowed.',
  })
  @IsString()
  @MinLength(5)
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ description: 'Referrer referral code' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(20)
  referralCode?: string;
}
