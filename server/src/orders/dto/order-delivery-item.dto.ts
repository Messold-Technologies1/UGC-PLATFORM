import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID } from 'class-validator';
import { OrderDeliveryAssetDto } from './order-delivery-asset.dto';

export class OrderDeliveryItemDto {
  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  creatorId!: string;

  @ApiProperty({
    example: 0,
    description:
      'Number of revisions used so far for this order delivery (0 for the initial delivery).',
  })
  @IsInt()
  revisionsUsed!: number;

  @ApiProperty({ type: () => [OrderDeliveryAssetDto] })
  assets!: OrderDeliveryAssetDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string | null;

  @ApiPropertyOptional({
    description:
      'Brand revision notes this delivery was submitted in response to. Null for the initial delivery or a pending revision that has not been delivered yet.',
  })
  @IsOptional()
  @IsString()
  brandRevisionNote?: string | null;

  @ApiProperty()
  createdAt!: Date;
}

