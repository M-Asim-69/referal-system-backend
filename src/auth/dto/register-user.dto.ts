import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';

const emptyToUndefined = ({ value }: { value: unknown }) =>
  typeof value === 'string' && value.trim() === '' ? undefined : value;

export class RegisterUserDto {
  @ApiProperty({ example: 'johndoe', description: 'Lowercase letters and numbers only' })
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  @Matches(/^[a-z0-9]+$/, { message: 'Username: small letters and numbers only' })
  username: string;

  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(20)
  mobile?: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @ApiProperty()
  @IsString()
  @MaxLength(100)
  fullName: string;

  @ApiPropertyOptional({ description: 'Referrer referral code' })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @MaxLength(20)
  referralCode?: string;
}
