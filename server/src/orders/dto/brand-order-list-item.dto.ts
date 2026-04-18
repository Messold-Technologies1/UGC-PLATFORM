import { ApiProperty } from '@nestjs/swagger';
import { OrderCreatorSnapshotDto } from './order-creator-snapshot.dto';
import { OrderListSummaryDto } from './order-list-summary.dto';

export class BrandOrderListItemDto {
  @ApiProperty({ type: () => OrderListSummaryDto })
  order!: OrderListSummaryDto;

  @ApiProperty({ type: () => OrderCreatorSnapshotDto })
  creator!: OrderCreatorSnapshotDto;
}
