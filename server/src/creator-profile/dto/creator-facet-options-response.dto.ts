import { ApiProperty } from '@nestjs/swagger';
import { CreatorFacetDimension } from '@prisma/client';

export class CreatorFacetOptionItemDto {
  @ApiProperty()
  slug!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  sortOrder!: number;
}

export class CreatorFacetOptionsResponseDto {
  @ApiProperty({
    description:
      'Facet options grouped by dimension. Each dimension key contains an ordered list of { slug, label, sortOrder }.',
    type: 'object',
    additionalProperties: {
      type: 'array',
      items: { $ref: '#/components/schemas/CreatorFacetOptionItemDto' },
    },
  })
  optionsByDimension!: Record<CreatorFacetDimension, CreatorFacetOptionItemDto[]>;
}
