import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  /**
   * Phone in E.164. When provided at signup (normal email+password flow), an
   * OTP code must accompany it and is verified before the account is created,
   * setting the user's phoneVerified. Omitted for Google signups, which verify
   * the phone later in the post-auth setup step.
   */
  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{8,15}$/, {
    message: 'phone must be E.164 (e.g. +919876543210)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: '123456' })
  @ValidateIf((o: RegisterDto) => Boolean(o.phone?.trim()))
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  phoneOtpCode?: string;
}
