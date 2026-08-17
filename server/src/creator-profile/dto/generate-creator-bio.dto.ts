import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/**
 * Signals for AI bio generation. All optional and sent from the wizard's live
 * state (the creator's own profile data) — human-readable labels, not slugs, so
 * the prompt reads naturally. The creator's NAME is deliberately not part of
 * this payload: the bio is first-person and must never include the name.
 */
export class GenerateCreatorBioDto {
  @ApiPropertyOptional({
    type: [String],
    description: 'Content-category (niche) labels, e.g. ["Beauty", "Skincare"].',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  niches?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Creator-type labels.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  creatorTypes?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Occupation labels.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(15)
  @IsString({ each: true })
  @MaxLength(60, { each: true })
  occupations?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Language labels.' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(40, { each: true })
  languages?: string[];

  @ApiPropertyOptional({ description: 'Gender label.' })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  gender?: string;

  @ApiPropertyOptional({ description: 'City name.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  city?: string;

  @ApiPropertyOptional({ description: 'Country name.' })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  country?: string;

  @ApiPropertyOptional({ description: 'ISO date of birth; server derives age.' })
  @IsOptional()
  @IsDateString()
  dateOfBirth?: string;
}

export class GeneratedBioResponseDto {
  @ApiProperty({ description: 'AI-generated bio, ready to drop into the field.' })
  bio!: string;
}
