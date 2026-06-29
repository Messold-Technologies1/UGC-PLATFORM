import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional, IsString } from 'class-validator';

export class OrderDeliveryAssetDto {
  @ApiProperty({ example: 'order-deliveries/<orderId>/r0/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ enum: ['video', 'image'] })
  @IsIn(['video', 'image'])
  kind!: 'video' | 'image';

  @ApiProperty({
    example: 'https://cdn.example.com/order-deliveries/...',
    description:
      'URL the viewer should use. For a brand before accepting the order this is the watermarked preview; after acceptance it is the original file.',
  })
  @IsString()
  url!: string;

  @ApiPropertyOptional({
    description:
      'True when `url` points to a watermarked preview (brand, pre-acceptance).',
  })
  @IsOptional()
  @IsBoolean()
  watermarked?: boolean;

  @ApiPropertyOptional({
    enum: ['pending', 'ready', 'failed'],
    description:
      'Watermark preview status. "pending" means the preview is still being generated.',
  })
  @IsOptional()
  @IsString()
  previewStatus?: 'pending' | 'ready' | 'failed';
}

