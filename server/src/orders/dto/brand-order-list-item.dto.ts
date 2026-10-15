import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderCreatorSnapshotDto } from './order-creator-snapshot.dto';
import { OrderListSummaryDto } from './order-list-summary.dto';

export class BrandOrderListItemDto {
  @ApiProperty({ type: () => OrderListSummaryDto })
  order!: OrderListSummaryDto;

  @ApiProperty({ type: () => OrderCreatorSnapshotDto })
  creator!: OrderCreatorSnapshotDto;

  @ApiPropertyOptional({
    example: 'Northstar Media',
    nullable: true,
    description:
      'The agency that placed this order on the brand\'s behalf, when one ' +
      'did. Null for the brand\'s own orders. The order is the brand\'s ' +
      'either way — this is attribution, not ownership.',
  })
  placedByAgencyName?: string | null;
}
