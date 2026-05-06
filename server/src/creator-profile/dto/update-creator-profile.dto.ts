import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreatorContentVolumeBucket,
  CreatorGender,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
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
    example: 'creator-profile/<userId>/<uuid>.jpg',
    description:
      'S3 object key after uploading via presigned URL (optional).',
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

  @ApiPropertyOptional({ example: 'https://instagram.com/jane' })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  instagramUrl?: string;

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

  @ApiPropertyOptional({ type: [CreatorFacetSelectionInputDto] })
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
    description: 'Legacy free-text categories (read in responses; optional replace).',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  categories?: string[];

  @ApiPropertyOptional({ type: [String] })
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
}
