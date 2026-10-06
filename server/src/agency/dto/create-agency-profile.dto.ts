import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateAgencyProfileDto {
  @ApiProperty({ example: 'Northstar Media', description: 'Agency display name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  name!: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description:
      'Optional contact phone. When omitted, the authenticated user phone is used if available.',
  })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'https://northstar.media' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;

  @ApiPropertyOptional({
    example: 'agency-logo-temp/<userId>/<uuid>.png',
    description:
      'Temporary S3 key returned by the agency-logo presign endpoint before profile creation.',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;
}
