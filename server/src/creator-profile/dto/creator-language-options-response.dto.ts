import { ApiProperty } from '@nestjs/swagger';
import { CreatorFacetOptionItemDto } from './creator-facet-options-response.dto';

export class CreatorLanguageOptionsResponseDto {
  @ApiProperty({
    type: [CreatorFacetOptionItemDto],
    description:
      'Language facet options from CreatorFacetOption (dimension LANGUAGE), ordered by sortOrder.',
  })
  languages!: CreatorFacetOptionItemDto[];
}
