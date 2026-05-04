import { ApiProperty } from '@nestjs/swagger';
import { BrandCategory } from '@prisma/client';

export class BrandCategoryOptionDto {
  @ApiProperty({ enum: BrandCategory })
  value!: BrandCategory;

  @ApiProperty({ example: 'Apparel & Fashion' })
  label!: string;
}
