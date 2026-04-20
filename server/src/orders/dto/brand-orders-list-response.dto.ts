import { ApiProperty } from '@nestjs/swagger';
import { BrandOrderListItemDto } from './brand-order-list-item.dto';

export class BrandOrdersListResponseDto {
  @ApiProperty({ type: () => [BrandOrderListItemDto] })
  items!: BrandOrderListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
