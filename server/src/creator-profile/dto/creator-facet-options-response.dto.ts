import { ApiProperty } from '@nestjs/swagger';
import { CreatorFacetDimension } from '@prisma/client';

export class CreatorFacetOptionItemDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: CreatorFacetDimension })
  dimension!: CreatorFacetDimension;

  @ApiProperty()
  slug!: string;

  @ApiProperty()
  label!: string;

  @ApiProperty()
  sortOrder!: number;
}

export class CreatorFacetOptionsResponseDto {
  @ApiProperty({ type: [CreatorFacetOptionItemDto] })
  options!: CreatorFacetOptionItemDto[];
}
