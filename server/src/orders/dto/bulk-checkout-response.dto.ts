import { ApiProperty } from '@nestjs/swagger';

export class BulkCheckoutSkippedItemDto {
  @ApiProperty({ format: 'uuid' })
  creatorId!: string;

  @ApiProperty({ format: 'uuid' })
  packageId!: string;

  @ApiProperty({ description: 'Why this item was skipped (not fatal).' })
  reason!: string;
}

export class BulkCheckoutResponseDto {
  @ApiProperty({ description: 'The checkout batch that owns the single payment.' })
  batchId!: string;

  @ApiProperty()
  razorpayOrderId!: string;

  @ApiProperty({ description: 'Grand total for all created orders (paise).' })
  amountPaise!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  razorpayKeyId!: string;

  @ApiProperty({ description: 'Number of orders created (one per valid item).' })
  orderCount!: number;

  @ApiProperty({ type: [String], description: 'IDs of the created orders.' })
  orderIds!: string[];

  @ApiProperty({
    type: [BulkCheckoutSkippedItemDto],
    description:
      'Items that could not be ordered (invalid/unavailable creator or stale add-on) and were skipped.',
  })
  skipped!: BulkCheckoutSkippedItemDto[];
}
