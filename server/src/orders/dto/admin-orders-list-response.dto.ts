import { ApiProperty } from '@nestjs/swagger';
import { AdminOrderListItemDto } from './admin-order-list-item.dto';

export class AdminOrdersListResponseDto {
  @ApiProperty({ type: () => [AdminOrderListItemDto] })
  items!: AdminOrderListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
