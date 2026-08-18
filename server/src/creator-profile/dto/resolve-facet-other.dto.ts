import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorFacetDimension } from '@prisma/client';
import { IsEnum, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolveFacetOtherDto {
  @ApiProperty({ enum: CreatorFacetDimension })
  @IsEnum(CreatorFacetDimension)
  dimension!: CreatorFacetDimension;

  @ApiProperty({ example: 'House wife' })
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  text!: string;
}

export class ResolvedFacetOptionDto {
  @ApiProperty({ enum: CreatorFacetDimension })
  dimension!: CreatorFacetDimension;

  @ApiProperty({ example: 'homemaker' })
  slug!: string;

  @ApiProperty({ example: 'Homemaker' })
  label!: string;
}

export class FacetOtherResolveResponseDto {
  @ApiProperty({
    enum: ['match', 'new', 'rejected', 'kept'],
    description:
      'match = mapped to an existing option; new = a valid new value that will be added to the catalog when the creator saves; rejected = not allowed; kept = keep as private custom text.',
  })
  action!: 'match' | 'new' | 'rejected' | 'kept';

  @ApiPropertyOptional({
    type: ResolvedFacetOptionDto,
    description: 'The existing option this maps to (action = match).',
  })
  option?: ResolvedFacetOptionDto;

  @ApiPropertyOptional({
    description: 'Normalized label to add on save (action = new).',
  })
  label?: string;

  @ApiProperty()
  typedText!: string;

  @ApiPropertyOptional({ enum: ['inappropriate', 'invalid'] })
  reason?: 'inappropriate' | 'invalid';

  @ApiPropertyOptional({ description: 'Human-readable note for the UI banner.' })
  message?: string;
}
