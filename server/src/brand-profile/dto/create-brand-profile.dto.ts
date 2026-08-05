import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BrandCategory, BrandProductType } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
  ValidateIf,
} from 'class-validator';

export class CreateBrandProfileDto {
  @ApiProperty({ example: 'Jane Doe', description: 'Primary contact name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactFullName!: string;

  @ApiPropertyOptional({
    example: 'brand@example.com',
    description:
      'Optional contact email. When omitted, outbound mail uses the account email.',
  })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  contactEmail?: string;

  @ApiPropertyOptional({
    example: '+91 98765 43210',
    description: 'Optional at signup; can be added later from brand settings.',
  })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  contactPhone?: string;

  @ApiProperty({ example: 'Acme', description: 'Public brand name shown to creators.' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  brandName!: string;

  @ApiPropertyOptional({
    example: 'brand-logo-temp/<userId>/<uuid>.png',
    description:
      'Temporary S3 object key returned by brand-logo presign endpoint before profile creation (optional).',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;

  @ApiPropertyOptional({
    example: 'brand-pronunciation-temp/<userId>/<uuid>.webm',
    description:
      'Temporary S3 key from pronunciation presign after uploading recorded audio (optional).',
  })
  @IsOptional()
  @IsString()
  brandPronunciationAudioKey?: string;

  @ApiPropertyOptional({ example: 'https://acme.com' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/acme' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  instagramUrl?: string;

  @ApiPropertyOptional({
    enum: BrandProductType,
    description: 'Physical, digital, or both.',
  })
  @IsOptional()
  @IsEnum(BrandProductType)
  productType?: BrandProductType;

  @ApiPropertyOptional({
    enum: BrandCategory,
    isArray: true,
    description: 'One or more categories from the prefilled list.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(BrandCategory, { each: true })
  categories?: BrandCategory[];

  @ApiPropertyOptional({
    example: 'Handmade crafts',
    description:
      'Required when categories includes OTHER. Stores the custom category label.',
  })
  @ValidateIf((o: CreateBrandProfileDto) => (o.categories ?? []).includes(BrandCategory.OTHER))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  otherCategoryLabel?: string;
}
