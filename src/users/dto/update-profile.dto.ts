import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '03001234567' })
  @IsOptional()
  @IsString()
  paymentAccountNumber?: string;

  @ApiPropertyOptional({ example: 'HBL' })
  @IsOptional()
  @IsString()
  paymentAccountBank?: string;

  @ApiPropertyOptional({ example: 'https://res.cloudinary.com/...', description: 'Profile image URL (upload via /files/upload)' })
  @IsOptional()
  @IsUrl()
  profileImageUrl?: string;
}
