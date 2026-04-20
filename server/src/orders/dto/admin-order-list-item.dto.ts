import { ApiProperty } from '@nestjs/swagger';
import { OrderBrandSnapshotDto } from './order-brand-snapshot.dto';
import { OrderCreatorSnapshotDto } from './order-creator-snapshot.dto';
import { OrderListSummaryDto } from './order-list-summary.dto';

export class AdminOrderListItemDto {
  @ApiProperty({ type: () => OrderListSummaryDto })
  order!: OrderListSummaryDto;

  @ApiProperty({ type: () => OrderCreatorSnapshotDto })
  creator!: OrderCreatorSnapshotDto;

  @ApiProperty({ type: () => OrderBrandSnapshotDto })
  brand!: OrderBrandSnapshotDto;
}
