import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorAgeGroup, CreatorGender } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  Validate,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

function toOptionalNonNegativeNumber(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(n)) return undefined;
  return n;
}

@ValidatorConstraint({ name: 'maxPriceGteMinPrice', async: false })
class MaxPriceGteMinPriceConstraint implements ValidatorConstraintInterface {
  validate(maxPrice: unknown, args: ValidationArguments): boolean {
    const o = args.object as { minPrice?: number };
    if (o.minPrice === undefined || maxPrice === undefined || maxPrice === null) {
      return true;
    }
    return Number(maxPrice) >= Number(o.minPrice);
  }

  defaultMessage(): string {
    return 'maxPrice must be greater than or equal to minPrice';
  }
}

function toTrimmedStringArray(value: unknown): string[] | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (Array.isArray(value)) {
    const out = value
      .map((v) => String(v).trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  if (typeof value === 'string') {
    const out = value
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    return out.length ? out : undefined;
  }
  return undefined;
}

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === false) return value;
  if (Array.isArray(value)) {
    return toOptionalBoolean(value[0]);
  }
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
    return undefined;
  }
  return undefined;
}

function trimOrUndefined(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return undefined;
  }
  const s = String(value).trim();
  return s.length ? s : undefined;
}

export class ListCreatorsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    example: 'fashion',
    description:
      'Public portfolio video industry label (case-insensitive). Matches creators with at least one matching video.',
  })
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value))
  @IsString()
  industry?: string;

  @ApiPropertyOptional({
    example: 'skincare',
    description:
      'Public portfolio video tag (case-insensitive). Matches creators with at least one video having this tag.',
  })
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value))
  @IsString()
  portfolioTag?: string;

  @ApiPropertyOptional({
    example: 'Kolkata',
    description: 'Substring match on city (case-insensitive).',
  })
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value))
  @IsString()
  city?: string;

  @ApiPropertyOptional({ enum: CreatorGender })
  @IsOptional()
  @IsEnum(CreatorGender)
  gender?: CreatorGender;

  @ApiPropertyOptional({
    example: 18,
    description: 'Minimum completed age (uses dateOfBirth). Combine with maxAge.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  minAge?: number;

  @ApiPropertyOptional({
    example: 35,
    description: 'Maximum completed age (uses dateOfBirth).',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(120)
  maxAge?: number;

  @ApiPropertyOptional({
    enum: CreatorAgeGroup,
    description: 'Predefined age band (combined with minAge/maxAge using intersection).',
  })
  @IsOptional()
  @IsEnum(CreatorAgeGroup)
  ageGroup?: CreatorAgeGroup;

  @ApiPropertyOptional({
    example: ['solo_individual', 'couple'],
    description: 'Facet slugs; OR within list, AND with other facet dimensions.',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  contentFormat?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  appearance?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  contentStyle?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  capability?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  lifeStyle?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  occupation?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Content category facet slugs (CreatorFacetDimension.CONTENT_CATEGORY); OR within list, AND with other dimensions.',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  contentCategory?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Category experience facet slugs (CreatorFacetDimension.CATEGORY_EXPERIENCE); OR within list.',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  categoryExperience?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  canCreateWith?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'AI content permission facet slugs; OR within list.',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  aiContentPermission?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Language facet slugs; OR within list.',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  language?: string[];

  @ApiPropertyOptional({
    example: true,
    description: 'Query: onLocationAvailable=true or false',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  onLocationAvailable?: boolean;

  @ApiPropertyOptional({
    example: ['does not accept alcohol'],
    description:
      'Repeat param or comma-separated. Creator must have any of these restrictions (OR).',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  restrictions?: string[];

  @ApiPropertyOptional({
    example: 100,
    description:
      'Minimum package price (inclusive). Matches creators with at least one package in range.',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNonNegativeNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  minPrice?: number;

  @ApiPropertyOptional({
    example: 500,
    description:
      'Maximum package price (inclusive). Must be >= minPrice when both are set.',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalNonNegativeNumber(value))
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Validate(MaxPriceGteMinPriceConstraint)
  maxPrice?: number;
}
