import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreatorContentVolumeBucket,
  CreatorGender,
} from '@prisma/client';
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
  IsUrl,
  Max,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { CreatorFacetSelectionInputDto } from './creator-facet-selection-input.dto';
import { CreatorProfileLanguageInputDto } from './creator-profile-language-input.dto';

export class CreatorPackageCreateDto {
  @ApiProperty({ example: 'Basic' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({
    example: ['1 Video'],
    description:
      'Optional. If omitted/empty, backend defaults to ["1 Video"].',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  deliverables?: string[];

  @ApiPropertyOptional({
    example: 60,
    description: 'Max 60 seconds.',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(60)
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
    example: 5,
    description: 'Fixed at 5 days (backend will enforce).',
  })
  @IsOptional()
  @IsInt()
  @ValidateIf((_, v) => v !== undefined)
  @Min(5)
  @Max(5)
  deliveryDays?: number;

  @ApiProperty({
    example: 2,
    description:
      'Maximum number of revision cycles included in this package.',
  })
  @IsInt()
  @Min(1)
  maxRevisions!: number;
}

export class CreatorAddOnCreateDto {
  @ApiProperty({
    example: 'on_location_shoot',
    description:
      'Predefined add-on slug from GET /creators/add-on-options.',
  })
  @Matches(/^[a-z0-9_]+$/, { message: 'slug must be snake_case' })
  slug!: string;

  @ApiPropertyOptional({
    example: 'On-location Shoot',
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

  @ApiProperty({ example: 'creator@example.com' })
  @IsEmail()
  @MaxLength(320)
  contactEmail!: string;

  @ApiPropertyOptional({ example: 'https://instagram.com/jane' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  instagramUrl?: string;

  @ApiPropertyOptional({ example: 'https://youtube.com/@jane' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  youtubeUrl?: string;

  @ApiPropertyOptional({ example: 'https://tiktok.com/@jane' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  tiktokUrl?: string;

  @ApiPropertyOptional({ example: 'https://snapchat.com/add/jane' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
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
      'Non-language facet selections (catalog slugs per dimension). Use profileLanguages for LANGUAGE. Dimensions include CONTENT_FORMAT, CONTENT_CATEGORY, APPEARANCE, AI_CONTENT_PERMISSION, etc.',
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
        name: '1 Video UGC',
        // deliverables optional; defaults to ["1 Video"] if omitted
        deliverables: ['1 Video', 'Basic editing'],
        videoLengthSeconds: 60,
        basicEditing: true,
        priceAmount: '500',
        deliveryDays: 5,
        maxRevisions: 1,
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
