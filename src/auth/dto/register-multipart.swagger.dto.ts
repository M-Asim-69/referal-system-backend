import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Swagger-only schema for POST /auth/register (multipart/form-data).
 * Actual validation happens in AuthService after upload.
 */
export class RegisterMultipartSwaggerDto {
  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email (unique)',
  })
  email: string;

  @ApiProperty({
    example: 'SecurePass@123',
    description: 'Min 8 chars; must include uppercase, lowercase, and number',
    minLength: 8,
  })
  password: string;

  @ApiProperty({ example: 'John Doe', description: 'Full name' })
  fullName: string;

  @ApiPropertyOptional({
    example: 'A1B2C3D4',
    description: 'Optional referral code from an ACTIVE user',
  })
  referralCode?: string;

  @ApiProperty({
    type: 'string',
    format: 'binary',
    description:
      'Required. Payment proof screenshot (JPEG/PNG/WEBP, max 5MB). Stored on Cloudinary; URL saved on INITIAL deposit for admin review.',
  })
  screenshot: Express.Multer.File;
}
