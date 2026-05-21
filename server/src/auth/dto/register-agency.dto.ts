import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class RegisterAgencyDto {
  @ApiProperty({ example: 'owner@northstar.media', description: 'Login email' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'securePassword123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @ApiProperty({ example: 'Northstar Media', description: 'Agency display name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: 'Jane Doe', description: 'Primary agency contact name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactFullName!: string;

  @ApiProperty({ example: 'ops@northstar.media' })
  @IsEmail()
  @MaxLength(320)
  contactEmail!: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description:
      'Optional E.164 phone. When provided, contactPhoneOtpCode is required.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^\+\d{8,15}$/, {
    message: 'contactPhone must be E.164 (e.g. +919876543210)',
  })
  contactPhone?: string;

  @ApiPropertyOptional({
    example: '123456',
    description: 'SMS OTP from POST /auth/signup/phone/send-otp',
  })
  @ValidateIf((o: RegisterAgencyDto) => !!o.contactPhone?.trim())
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  contactPhoneOtpCode?: string;

  @ApiPropertyOptional({ example: 'https://northstar.media' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;

  @ApiPropertyOptional({
    example: 'agency-logo-signup-temp/<hash>/<uuid>.png',
    description: 'Temp key from POST /auth/signup/presign/agency-logo',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;
}
