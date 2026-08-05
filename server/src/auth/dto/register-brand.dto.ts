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

export class RegisterBrandDto {
  @ApiProperty({ example: 'jane@example.com', description: 'Login email' })
  @IsEmail()
  @MaxLength(320)
  email!: string;

  @ApiProperty({ example: 'securePassword123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password!: string;

  @ApiProperty({ example: 'Jane Doe', description: 'Primary contact name' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  contactFullName!: string;

  @ApiPropertyOptional({
    example: 'brand@example.com',
    description:
      'Optional. When omitted, outbound mail uses the account email. Brands can set this later in settings.',
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
    example: 'brand-logo-signup-temp/<hash>/<uuid>.png',
    description: 'Temp key from POST /auth/signup/presign/brand-logo',
  })
  @IsOptional()
  @IsString()
  logoKey?: string;

  @ApiPropertyOptional({
    example: 'brand-pronunciation-signup-temp/<hash>/<uuid>.webm',
    description: 'Temp key from POST /auth/signup/presign/brand-pronunciation',
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
  @ValidateIf((o: RegisterBrandDto) => (o.categories ?? []).includes(BrandCategory.OTHER))
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  otherCategoryLabel?: string;
}
