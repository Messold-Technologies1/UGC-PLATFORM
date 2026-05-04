import { ApiProperty } from '@nestjs/swagger';
import { BrandCategoryOptionDto } from './brand-category-option.dto';

export class BrandCategoryOptionsResponseDto {
  @ApiProperty({ type: () => [BrandCategoryOptionDto] })
  items!: BrandCategoryOptionDto[];
}
