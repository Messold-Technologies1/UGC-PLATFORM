import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorContentVolumeBucket, CreatorGender } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  Matches,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatorFacetSelectionInputDto } from './creator-facet-selection-input.dto';
import { CreatorProfileLanguageInputDto } from './creator-profile-language-input.dto';

export class CreatorPackageCreateDto {
  @ApiPropertyOptional({
    example: 'Standard',
    description: 'Defaults to "Standard" when omitted or blank.',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({
    example: ['1 Video'],
    description: 'Optional. If omitted/empty, backend defaults to ["1 Video"].',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional({
    example: 60,
    description: 'Positive integer seconds. No upper limit.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  videoLengthSeconds?: number;

  @ApiPropertyOptional({ example: true, description: 'Basic Editing: Yes/No' })
  @IsOptional()
  @IsBoolean()
  basicEditing?: boolean;

  @ApiProperty({
    example: '1500',
    description: 'Must be >= 500 and in steps of 500 (500, 1000, 1500, ...).',
  })
  @Matches(/^\d+$/, { message: 'priceAmount must be a whole number string' })
  priceAmount!: string;

  @ApiPropertyOptional({
    example: 'USD',
    description:
      'ISO code of the currency the creator typed in. Omit or send INR for ' +
      'a rupee price. Anything else is converted to rupees SERVER-side at ' +
      'the current rate — `priceAmount` is ignored when this is set, so a ' +
      'client cannot choose its own rate.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'priceCurrency must be a 3-letter ISO code',
  })
  priceCurrency?: string;

  @ApiPropertyOptional({
    example: '100',
    description:
      'The amount in `priceCurrency`, as typed. Required when ' +
      '`priceCurrency` is set to anything other than INR.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'priceAmountOriginal must be a number with at most 2 decimals',
  })
  priceAmountOriginal?: string;


  @ApiPropertyOptional({
    example: 5,
    description: 'Delivery timeline in days (1–30).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  deliveryDays?: number;

  @ApiPropertyOptional({
    example: 2,
    description:
      'Maximum number of revision cycles included in this package. Defaults to 2.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  maxRevisions?: number;
}

export class CreatorAddOnCreateDto {
  @ApiProperty({
    example: 'on_location_shoot',
    description: 'Predefined add-on slug from GET /creators/add-on-options.',
  })
  @Matches(/^[a-z0-9_]+$/, { message: 'slug must be snake_case' })
  slug!: string;

  @ApiPropertyOptional({
    example: 'On-location Shoot (25 km)',
    description:
      'Optional display name (backend will override with catalog name).',
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: '500',
    description:
      'Whole number string. Backend enforces per add-on rules (fixed/min/step).',
  })
  @Matches(/^\d+$/, { message: 'priceAmount must be a whole number string' })
  priceAmount!: string;

  @ApiPropertyOptional({
    example: 'USD',
    description:
      'ISO code of the currency the creator typed in. Omit or send INR for ' +
      'a rupee price. Anything else is converted to rupees SERVER-side at ' +
      'the current rate — `priceAmount` is ignored when this is set, so a ' +
      'client cannot choose its own rate.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^[A-Za-z]{3}$/, {
    message: 'priceCurrency must be a 3-letter ISO code',
  })
  priceCurrency?: string;

  @ApiPropertyOptional({
    example: '100',
    description:
      'The amount in `priceCurrency`, as typed. Required when ' +
      '`priceCurrency` is set to anything other than INR.',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d+(\.\d{1,2})?$/, {
    message: 'priceAmountOriginal must be a number with at most 2 decimals',
  })
  priceAmountOriginal?: string;


  @ApiPropertyOptional({
    example: 'Travel and setup for in-store shoots',
  })
  @IsOptional()
  @IsString()
  description?: string;
}

export class CreateCreatorProfileDto {
  @ApiProperty({ example: 'Jane Doe' })
  @IsString()
  displayName!: string;

  @ApiPropertyOptional({
    example: 'creator-profile/<profileId>/intro/<uuid>.mp4',
    description:
      'Intro video S3 key from POST /creators/profile/uploads/presign-intro-video.',
  })
  @IsOptional()
  @IsString()
  introVideoKey?: string;

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
  @MaxLength(500)
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

  @ApiProperty({ example: 'creator@example.com' })
  @IsEmail()
  @MaxLength(320)
  contactEmail!: string;

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

  @ApiPropertyOptional({
    enum: CreatorContentVolumeBucket,
    description: 'Approximate lifetime content count bucket (0 maps to NONE).',
  })
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

  @ApiPropertyOptional({
    type: [CreatorFacetSelectionInputDto],
    description:
      'Non-language facet selections (catalog slugs per dimension). Use profileLanguages for LANGUAGE. Dimensions: CONTENT_CATEGORY, CREATOR_TYPE, OCCUPATION, APPEARANCE.',
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

  @ApiPropertyOptional({
    type: [CreatorPackageCreateDto],
    example: [
      {
        name: 'Standard',
        deliverables: [
          '1 Video',
          'Basic editing',
          'Raw footage',
          '1080p minimum',
        ],
        videoLengthSeconds: 60,
        basicEditing: true,
        priceAmount: '500',
        deliveryDays: 5,
        maxRevisions: 2,
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreatorPackageCreateDto)
  packages?: CreatorPackageCreateDto[];

  @ApiPropertyOptional({
    type: [CreatorAddOnCreateDto],
    example: [
      {
        name: 'On-location shoot fee',
        priceAmount: '499.00',
        description: 'Travel and setup for in-store shoots',
      },
    ],
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreatorAddOnCreateDto)
  addOns?: CreatorAddOnCreateDto[];
}
