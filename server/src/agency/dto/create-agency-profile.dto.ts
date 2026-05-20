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

export class CreateAgencyProfileDto {
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
      'Optional E.164 phone. When provided, contactPhoneOtpCode is required (verify via send-otp first).',
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
    description: 'SMS OTP code from POST /agency/profile/contact-phone/send-otp',
  })
  @ValidateIf((o: CreateAgencyProfileDto) => !!o.contactPhone?.trim())
  @IsString()
  @MinLength(4)
  @MaxLength(10)
  contactPhoneOtpCode?: string;

  @ApiPropertyOptional({ example: 'https://northstar.media' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;

  @ApiPropertyOptional({
    example: 'agency-logo-temp/<userId>/<uuid>.png',
    description: 'Temporary logo key from agency logo presign endpoint',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;
}
