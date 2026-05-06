import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  CreatorContentVolumeBucket,
  CreatorGender,
} from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumberString,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreatorFacetSelectionInputDto } from './creator-facet-selection-input.dto';
import { CreatorProfileLanguageInputDto } from './creator-profile-language-input.dto';

export class CreatorPackageCreateDto {
  @ApiProperty({ example: 'Basic' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '["1 Video", "Basic editing"]' })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsString({ each: true })
  deliverables!: string[];

  @ApiProperty({ example: '199.99' })
  @IsNumberString()
  priceAmount!: string;

  @ApiProperty({ example: 3 })
  @IsInt()
  @Min(0)
  deliveryDays!: number;

  @ApiProperty({
    example: 2,
    description:
      'Maximum number of revision cycles included in this package.',
  })
  @IsInt()
  @Min(0)
  maxRevisions!: number;
}

export class CreatorAddOnCreateDto {
  @ApiProperty({ example: 'On-location shoot fee' })
  @IsString()
  name!: string;

  @ApiProperty({ example: '499.00' })
  @IsNumberString()
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
    example: 'creator-profile-temp/<userId>/<uuid>.jpg',
    description:
      'Temporary S3 object key returned by profile-image presign endpoint before profile creation (optional).',
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

  @ApiPropertyOptional({
    type: [CreatorPackageCreateDto],
    example: [
      {
        name: 'Basic',
        deliverables: ['1 Video', 'Basic editing'],
        priceAmount: '199.99',
        deliveryDays: 3,
        maxRevisions: 2,
      },
    ],
  })
  @IsOptional()
  @IsArray()
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
