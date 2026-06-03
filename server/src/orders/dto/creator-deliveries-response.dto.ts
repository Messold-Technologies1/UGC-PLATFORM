import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderDeliveryAssetDto } from './order-delivery-asset.dto';

export class CreatorDeliveryOrderSnapshotDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'DELIVERED' })
  status!: string;

  @ApiProperty({ example: 'Acme Corp' })
  brandName!: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/logo.png' })
  brandLogoUrl!: string | null;
}

export class CreatorDeliveryItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'uuid' })
  orderId!: string;

  @ApiProperty({
    example: 0,
    description: '0 for the initial delivery, increments per revision.',
  })
  revisionNumber!: number;

  @ApiProperty({ type: () => [OrderDeliveryAssetDto] })
  assets!: OrderDeliveryAssetDto[];

  @ApiPropertyOptional()
  note!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty({ type: () => CreatorDeliveryOrderSnapshotDto })
  order!: CreatorDeliveryOrderSnapshotDto;
}

export class CreatorDeliveriesResponseDto {
  @ApiProperty({ type: () => [CreatorDeliveryItemDto] })
  items!: CreatorDeliveryItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
