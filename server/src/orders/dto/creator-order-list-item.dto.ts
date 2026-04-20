import { ApiProperty } from '@nestjs/swagger';
import { OrderBrandSnapshotDto } from './order-brand-snapshot.dto';
import { OrderListSummaryDto } from './order-list-summary.dto';

export class CreatorOrderListItemDto {
  @ApiProperty({ type: () => OrderListSummaryDto })
  order!: OrderListSummaryDto;

  @ApiProperty({ type: () => OrderBrandSnapshotDto })
  brand!: OrderBrandSnapshotDto;
}
