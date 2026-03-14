import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Admin signup: email + password only.
 * Send header **x-admin-register-secret** = `ADMIN_REGISTER_SECRET` from `.env`.
 */
export class RegisterAdminDto {
  @ApiProperty({ example: 'admin@platform.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({
    example: 'Admin@123456',
    description: 'Min 8 chars; uppercase, lowercase, and number required',
    minLength: 8,
  })
  @IsString()
  @MinLength(8)
  @MaxLength(50)
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: 'Password must contain uppercase, lowercase, and number',
  })
  password: string;

  @ApiPropertyOptional({
    example: 'System Administrator',
    description: 'Defaults to "Administrator" if omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;
}
