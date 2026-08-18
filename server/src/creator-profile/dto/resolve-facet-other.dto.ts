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
    enum: ['match', 'created', 'rejected', 'kept'],
    description:
      'match = mapped to an existing option; created = new option added to the catalog; rejected = not allowed; kept = keep as private custom text.',
  })
  action!: 'match' | 'created' | 'rejected' | 'kept';

  @ApiPropertyOptional({ type: ResolvedFacetOptionDto })
  option?: ResolvedFacetOptionDto;

  @ApiProperty()
  typedText!: string;

  @ApiPropertyOptional({ enum: ['inappropriate', 'invalid'] })
  reason?: 'inappropriate' | 'invalid';

  @ApiPropertyOptional({ description: 'Human-readable note for the UI banner.' })
  message?: string;
}
