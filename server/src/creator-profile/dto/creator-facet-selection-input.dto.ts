import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorFacetDimension } from '@prisma/client';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatorFacetSelectionInputDto {
  @ApiProperty({
    enum: CreatorFacetDimension,
    example: CreatorFacetDimension.CONTENT_CATEGORY,
  })
  @IsEnum(CreatorFacetDimension)
  dimension!: CreatorFacetDimension;

  @ApiProperty({ example: 'solo_individual' })
  @IsString()
  @Matches(/^[a-z0-9_]+$/)
  slug!: string;

  @ApiPropertyOptional({
    description:
      'Niche ordering (CONTENT_CATEGORY only): 0 = primary, 1..2 = secondary. Defaults to 0.',
    minimum: 0,
    maximum: 2,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(2)
  rank?: number;

  @ApiPropertyOptional({
    description:
      'Free text when slug is "other" (e.g. a niche/occupation not in the list).',
    maxLength: 40,
  })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  customLabel?: string;
}
