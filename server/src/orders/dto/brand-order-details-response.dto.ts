import { ApiProperty } from '@nestjs/swagger';
import { OrderCreatorSnapshotDto } from './order-creator-snapshot.dto';
import { OrderDetailsPublicDto } from './order-details-public.dto';

export class BrandOrderDetailsResponseDto {
  @ApiProperty({ type: () => OrderDetailsPublicDto })
  order!: OrderDetailsPublicDto;

  @ApiProperty({ type: () => OrderCreatorSnapshotDto })
  creator!: OrderCreatorSnapshotDto;
}

