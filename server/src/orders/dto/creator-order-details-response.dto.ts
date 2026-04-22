import { ApiProperty } from '@nestjs/swagger';
import { OrderBrandSnapshotDto } from './order-brand-snapshot.dto';
import { OrderDetailsPublicDto } from './order-details-public.dto';

export class CreatorOrderDetailsResponseDto {
  @ApiProperty({ type: () => OrderDetailsPublicDto })
  order!: OrderDetailsPublicDto;

  @ApiProperty({ type: () => OrderBrandSnapshotDto })
  brand!: OrderBrandSnapshotDto;
}

