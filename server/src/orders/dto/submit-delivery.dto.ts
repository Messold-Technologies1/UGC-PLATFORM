import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, IsArray, IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class SubmitDeliveryAssetDto {
  @ApiProperty({ example: 'order-deliveries/<orderId>/r0/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ enum: ['video', 'image'] })
  @IsIn(['video', 'image'])
  kind!: 'video' | 'image';
}

export class SubmitDeliveryDto {
  @ApiProperty({ type: [SubmitDeliveryAssetDto] })
  @IsArray()
  @ArrayMaxSize(20)
  assets!: SubmitDeliveryAssetDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  note?: string;
}

export class SubmitDeliveryResponseDto {
  @ApiProperty({ example: 'uuid' })
  @IsUUID()
  orderId!: string;

  @ApiProperty({ example: 0 })
  revisionNumber!: number;

  @ApiProperty()
  status!: string;
}

