import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
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
   *
   * Whether the code is actually required is decided by PHONE_OTP_ENABLED, in
   * the service rather than here — validation decorators cannot read config,
   * and a DTO that hard-required the code would veto the switch before
   * `AuthService` ever saw the request.
   */
  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(/^\+\d{8,15}$/, {
    message: 'phone must be E.164 (e.g. +919876543210)',
  })
  phone?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  phoneOtpCode?: string;
}
