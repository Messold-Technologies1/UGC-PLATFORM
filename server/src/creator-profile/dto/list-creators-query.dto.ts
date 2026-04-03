import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

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

  @ApiPropertyOptional({ example: 'Female' })
  @IsOptional()
  @Transform(({ value }) => trimOrUndefined(value))
  @IsString()
  gender?: string;

  @ApiPropertyOptional({
    example: true,
    description: 'Query: onLocationAvailable=true or false',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  onLocationAvailable?: boolean;

  @ApiPropertyOptional({
    example: ['minimal', 'aesthetic'],
    description:
      'Repeat param or comma-separated. Creator must have any of these persona tags (OR).',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  personaTags?: string[];

  @ApiPropertyOptional({
    example: ['UGC Video'],
    description:
      'Repeat param or comma-separated. Creator must have any of these categories (OR).',
  })
  @IsOptional()
  @Transform(({ value }) => toTrimmedStringArray(value))
  @IsArray()
  @IsString({ each: true })
  categories?: string[];

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
}
