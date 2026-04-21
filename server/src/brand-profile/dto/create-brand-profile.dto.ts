import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl } from 'class-validator';

export class CreateBrandProfileDto {
  @ApiProperty({ example: 'Acme Inc.' })
  @IsString()
  companyName!: string;

  @ApiPropertyOptional({
    example: 'brand-logo-temp/<userId>/<uuid>.png',
    description:
      'Temporary S3 object key returned by brand-logo presign endpoint before profile creation (optional).',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;

  @ApiPropertyOptional({ example: 'Skincare' })
  @IsOptional()
  @IsString()
  industry?: string;

  @ApiPropertyOptional({ example: 'Jane (Marketing Lead)' })
  @IsOptional()
  @IsString()
  contactPerson?: string;
}
