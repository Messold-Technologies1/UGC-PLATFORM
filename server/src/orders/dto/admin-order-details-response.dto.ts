import { ApiProperty } from '@nestjs/swagger';
import { OrderBrandSnapshotDto } from './order-brand-snapshot.dto';
import { OrderCreatorSnapshotDto } from './order-creator-snapshot.dto';
import { OrderDetailsAdminDto } from './order-details-admin.dto';

export class AdminOrderDetailsResponseDto {
  @ApiProperty({ type: () => OrderDetailsAdminDto })
  order!: OrderDetailsAdminDto;

  @ApiProperty({ type: () => OrderCreatorSnapshotDto })
  creator!: OrderCreatorSnapshotDto;

  @ApiProperty({ type: () => OrderBrandSnapshotDto })
  brand!: OrderBrandSnapshotDto;
}

