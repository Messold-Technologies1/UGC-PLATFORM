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
    description: 'Delivery due date (package delivery days + 2 grace from product receipt)',
    example: '2026-05-22T07:06:29.604Z',
  })
  deliveryDeadlineAt!: Date;
}
