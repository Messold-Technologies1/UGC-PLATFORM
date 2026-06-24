import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class MarkProductReceivedResponseDto {
  @ApiProperty({ example: 'uuid' })
  orderId!: string;

  @ApiProperty({ enum: OrderStatus, example: 'PRODUCT_RECEIVED' })
  status!: OrderStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2026-05-15T07:06:29.604Z',
  })
  productReceivedAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Promised delivery due date from product receipt',
    example: '2026-05-22T07:06:29.604Z',
  })
  deliveryDueAt!: Date;

  @ApiProperty({
    type: String,
    format: 'date-time',
    description: 'Final delivery cutoff after grace period',
    example: '2026-05-24T07:06:29.604Z',
  })
  deliveryGraceDeadlineAt!: Date;
}
