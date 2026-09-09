import { ApiProperty } from '@nestjs/swagger';
import { AdminOrderListItemDto } from './admin-order-list-item.dto';

export class AdminOrdersListResponseDto {
  @ApiProperty({ type: () => [AdminOrderListItemDto] })
  items!: AdminOrderListItemDto[];

  @ApiProperty({
    description:
      'Total orders matching the status filter (drives pagination of the ' +
      'active tab). When no status filter is given, this is the full count.',
  })
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;

  @ApiProperty({
    description:
      'Count of orders per lifecycle status across the whole result set ' +
      '(ignoring the status filter and pagination), so status-tab badges are ' +
      'always accurate regardless of which page or tab is loaded.',
    example: { ACCEPTED: 3, CREATOR_PAYMENT_DONE: 12, REFUNDED: 1 },
    additionalProperties: { type: 'number' },
  })
  statusCounts!: Record<string, number>;
}
