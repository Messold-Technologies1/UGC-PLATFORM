import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreatorContentVolumeBucket,
  CreatorGender,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import {
  CreatorAddOnCreateDto,
  CreatorPackageCreateDto,
} from './create-creator-profile.dto';
import { CreatorFacetSelectionInputDto } from './creator-facet-selection-input.dto';
import { CreatorProfileLanguageInputDto } from './creator-profile-language-input.dto';

export class UpdateCreatorProfileDto {
  @ApiPropertyOptional({ example: 'Jane Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({
    example: '+919876543210',
    description:
      'Updates User.phone (E.164). If the number changes, phoneVerified is cleared until OTP verification.',
  })
  @IsOptional()
  @IsString()
  @MinLength(8)
  @Matches(/^\+\d{8,15}$/, {
    message: 'phone must be E.164 (e.g. +919876543210)',
  })
  phone?: string;

  @ApiPropertyOptional({
    example: 'creator-profile/<profileId>/intro/<uuid>.mp4',
    description:
      'Intro video S3 key under creator-profile/<id>/intro/ from presign, or empty string to remove.',
  })
  @IsOptional()
  @IsString()
  introVideoKey?: string;

  @ApiPropertyOptional({
    example: 'creator-profile/<profileId>/profile-image/<uuid>.jpg',
    description:
      'Profile image S3 key under creator-profile/<id>/profile-image/ from presign, or empty string to remove.',
  })
  @IsOptional()
  @IsString()
  profileImageKey?: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  countryName?: string;

  @ApiPropertyOptional({ example: 'Karnataka' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  stateName?: string;

  @ApiPropertyOptional({ example: 'Bengaluru' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  city?: string;

  @ApiPropertyOptional({ example: 'One line about the creator.' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bio?: string;

  @ApiPropertyOptional({ enum: CreatorGender })
  @IsOptional()
  @IsEnum(CreatorGender)
  gender?: CreatorGender;

  @ApiPropertyOptional({ example: '1995-04-15' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  shippingAddress?: string;

  @ApiPropertyOptional({ example: 'creator@example.com' })
  @IsOptional()
  @IsEmail()
  @MaxLength(320)
  contactEmail?: string;

  @ApiPropertyOptional({
    example: '@jane',
    description: 'Instagram handle or profile URL (plain string).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  instagramUrl?: string;

  @ApiPropertyOptional({
    example: '@jane',
    description: 'YouTube handle or profile URL (plain string).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  youtubeUrl?: string;

  @ApiPropertyOptional({
    example: '@jane',
    description: 'Snapchat handle or profile URL (plain string).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  snapchatUrl?: string;

  @ApiPropertyOptional({ enum: CreatorContentVolumeBucket })
  @IsOptional()
  @IsEnum(CreatorContentVolumeBucket)
  contentVolume?: CreatorContentVolumeBucket;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(0)
  collaborationCount?: number;

  @ApiPropertyOptional({ example: 15 })
  @IsOptional()
  @IsInt()
  @Min(0)
  travelRadius?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  onLocationAvailable?: boolean;

  /**
   * When true, this update is an explicit "Go Live" — the backend may latch
   * `completeProfile` if the checklist is satisfied. When omitted/false the
   * update is a draft save: data is persisted but the profile is NOT published.
   */
  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  goLive?: boolean;

  @ApiPropertyOptional({
    type: [CreatorFacetSelectionInputDto],
    description:
      'When provided, replaces non-language facet selections. Use profileLanguages for LANGUAGE.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatorFacetSelectionInputDto)
  facetSelections?: CreatorFacetSelectionInputDto[];

  @ApiPropertyOptional({ type: [CreatorProfileLanguageInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatorProfileLanguageInputDto)
  profileLanguages?: CreatorProfileLanguageInputDto[];

  @ApiPropertyOptional({ type: [CreatorPackageCreateDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatorPackageCreateDto)
  packages?: CreatorPackageCreateDto[];

  @ApiPropertyOptional({ type: [CreatorAddOnCreateDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatorAddOnCreateDto)
  addOns?: CreatorAddOnCreateDto[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Accepted for API compatibility; ignored when updating (persona tags were removed).',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  personaTags?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  restrictions?: string[];

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  whatsappNotificationsEnabled?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  emailNotificationsEnabled?: boolean;
}
