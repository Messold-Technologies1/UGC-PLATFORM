import { ApiPropertyOptional } from '@nestjs/swagger';
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

export class UpdateBrandProfileDto {
  @ApiPropertyOptional({ example: 'Acme' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  brandName?: string;

  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactFullName?: string;

  @ApiPropertyOptional({ example: 'brand@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  contactEmail?: string;

  @ApiPropertyOptional({ example: '+91 98765 43210' })
  @IsOptional()
  @IsString()
  @MinLength(7)
  @MaxLength(32)
  contactPhone?: string;

  @ApiPropertyOptional({ example: 'ACK-mee', nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  brandPronunciation?: string | null;

  @ApiPropertyOptional({
    example: 'https://acme.com',
    nullable: true,
    description: 'Set to null to clear the website.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  website?: string | null;

  @ApiPropertyOptional({
    example: 'https://instagram.com/acme',
    nullable: true,
    description: 'Set to null to clear Instagram URL.',
  })
  @IsOptional()
  @IsUrl({ require_tld: false })
  instagramUrl?: string | null;

  @ApiPropertyOptional({
    enum: BrandProductType,
    nullable: true,
    description: 'Set to null to clear product type.',
  })
  @IsOptional()
  @IsEnum(BrandProductType)
  productType?: BrandProductType | null;

  @ApiPropertyOptional({
    enum: BrandCategory,
    isArray: true,
    description:
      'When provided, replaces all selected categories (empty array clears).',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsEnum(BrandCategory, { each: true })
  categories?: BrandCategory[];

  @ApiPropertyOptional({
    example: 'Handmade crafts',
    nullable: true,
    description:
      'Custom category label for OTHER. Required when categories includes OTHER. Set null to clear.',
  })
  @ValidateIf((o: UpdateBrandProfileDto) => (o.categories ?? []).includes(BrandCategory.OTHER))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  otherCategoryLabel?: string | null;

  @ApiPropertyOptional({
    example: 'brand-logo-temp/<userId>/<uuid>.png',
    nullable: true,
    description: 'New temp logo key from presign, or null to remove logo.',
  })
  @IsOptional()
  @IsString()
  logoKey?: string | null;

  @ApiPropertyOptional({
    example: 'brand-pronunciation-temp/<userId>/<uuid>.webm',
    nullable: true,
    description:
      'New temp pronunciation audio key from presign, or null to remove audio.',
  })
  @IsOptional()
  @IsString()
  brandPronunciationAudioKey?: string | null;
}
