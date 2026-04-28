import { ApiProperty } from '@nestjs/swagger';
import { OrderDeliveryItemDto } from './order-delivery-item.dto';

export class OrderDeliveriesResponseDto {
  @ApiProperty({ type: () => [OrderDeliveryItemDto] })
  items!: OrderDeliveryItemDto[];
}

