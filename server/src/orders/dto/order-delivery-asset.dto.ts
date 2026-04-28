import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';

export class OrderDeliveryAssetDto {
  @ApiProperty({ example: 'order-deliveries/<orderId>/r0/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ enum: ['video', 'image'] })
  @IsIn(['video', 'image'])
  kind!: 'video' | 'image';

  @ApiProperty({ example: 'https://cdn.example.com/order-deliveries/...' })
  @IsString()
  url!: string;
}

