import { ApiProperty } from '@nestjs/swagger';
import { AdminBrandListItemDto } from './admin-brand-list-item.dto';

export class BrandsListResponseDto {
  @ApiProperty({ type: () => [AdminBrandListItemDto] })
  items!: AdminBrandListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}
