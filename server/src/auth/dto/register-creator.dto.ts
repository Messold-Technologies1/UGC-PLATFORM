import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterCreatorDto {
  @ApiProperty({ example: 'jane@example.com' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'securePassword123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @MinLength(8)
  @Matches(/^\+\d{8,15}$/, {
    message: 'phone must be E.164 (e.g. +919876543210)',
  })
  phone!: string;

  /** Optional while signup OTP verification is disabled on the server. */
  @ApiPropertyOptional({ example: '123456' })
  @IsOptional()
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  phoneOtpCode?: string;

  @ApiPropertyOptional({
    description:
      'Meta Pixel _fbp cookie captured in the browser at signup (for Conversions API attribution).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaFbp?: string;

  @ApiPropertyOptional({
    description:
      'Meta Pixel _fbc cookie (ad-click id) captured in the browser at signup.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(1024)
  metaFbc?: string;

  @ApiPropertyOptional({
    description:
      'Shared event id for deduplicating the browser + server CompleteRegistration events in Meta.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  metaSignupEventId?: string;
}
