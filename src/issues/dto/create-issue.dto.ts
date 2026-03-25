import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateIssueDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: '03001234567', description: 'Mobile/phone number' })
  @IsString()
  @MinLength(5)
  @MaxLength(30)
  mobile: string;

  @ApiProperty({ example: 'Withdrawal pending', description: 'Issue subject' })
  @IsString()
  @MinLength(3)
  @MaxLength(255)
  subject: string;

  @ApiProperty({ example: 'My withdrawal has been pending for 2 days...' })
  @IsString()
  @MinLength(3)
  message: string;
}
