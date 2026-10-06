import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class UpdateAgencyProfileDto {
  @ApiPropertyOptional({ example: 'Northstar Media' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name?: string;

  @ApiPropertyOptional({ example: 'Alex Rivera' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactFullName?: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    nullable: true,
    description: 'Pass null or empty string to clear the contact phone.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  contactPhone?: string | null;

  @ApiPropertyOptional({ example: 'https://northstar.media', nullable: true })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsUrl({ require_tld: false })
  website?: string | null;

  @ApiPropertyOptional({
    example: 'agency-logo-temp/<userId>/<uuid>.png',
    nullable: true,
    description:
      'Temporary S3 key from the agency-logo presign endpoint, existing logoKey, or null to remove.',
  })
  @IsOptional()
  @ValidateIf((_, value) => value !== null && value !== '')
  @IsString()
  logoKey?: string | null;
}
