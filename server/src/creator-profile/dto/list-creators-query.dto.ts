import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorAgeGroup, CreatorGender } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
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
  @ApiPropertyOptional({
    example: 'aanya',
    description:
      'Free-text search by creator name, city, state, country, or bio (case-insensitive substring).',
  })
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value))
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10_000)
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    example: 'Kolkata',
    description: 'Substring match on city (case-insensitive).',
  })
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value))
  @IsString()
  @MaxLength(100)
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
    type: [String],
    description:
      'Creator type facet slugs (CreatorFacetDimension.CREATOR_TYPE); OR within list.',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  creatorType?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  appearance?: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  occupation?: string[];

  @ApiPropertyOptional({
    type: [String],
    description:
      'Content category facet slugs (CreatorFacetDimension.CONTENT_CATEGORY); OR within list, AND with other dimensions.',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  contentCategory?: string[];

  @ApiPropertyOptional({
    type: [String],
    description: 'Language facet slugs; OR within list.',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
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
    example: ['swimwear / beachwear'],
    description:
      'Repeat param or comma-separated. Creator must have any of these restrictions (OR).',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @ArrayMaxSize(30)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
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

  @ApiPropertyOptional({
    example: 3,
    description:
      'Maximum delivery days (inclusive). Matches creators with at least one package at or below this threshold.',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  maxDeliveryDays?: number;
}
