import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  DELIVERY_ASSET_MAX_BYTES,
  S3_MAX_PARTS,
} from './presign-delivery-upload.dto';

export class CreateDeliveryMultipartUploadDto {
  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  contentType!: string;

  @ApiProperty({
    example: 367001600,
    description: `Total file size in bytes (max ${DELIVERY_ASSET_MAX_BYTES}).`,
  })
  @IsInt()
  @Min(1)
  @Max(DELIVERY_ASSET_MAX_BYTES)
  contentLength!: number;

  @ApiProperty({ enum: ['video', 'image'], example: 'video' })
  @IsIn(['video', 'image'])
  kind!: 'video' | 'image';
}

export class CreateDeliveryMultipartUploadResponseDto {
  @ApiProperty({ example: 'order-deliveries/<orderId>/r0/<uuid>.mp4' })
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  uploadId!: string;

  @ApiProperty({ example: 'https://cdn.example.com/order-deliveries/...mp4' })
  cdnUrl!: string;

  @ApiProperty({ example: 10 * 1024 * 1024 })
  partSizeBytes!: number;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;
}

export class SignDeliveryMultipartPartDto {
  @ApiProperty({ example: 'order-deliveries/<orderId>/r0/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  @IsString()
  uploadId!: string;

  @ApiProperty({ example: 1, description: '1-based part number.' })
  @IsInt()
  @Min(1)
  @Max(S3_MAX_PARTS)
  partNumber!: number;
}

export class SignDeliveryMultipartPartResponseDto {
  @ApiProperty({ example: 'https://s3...signed...' })
  url!: string;
}

export class CompletedDeliveryPartDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(S3_MAX_PARTS)
  partNumber!: number;

  @ApiProperty({ example: '"e868e0f4859b1b2c8e6f..."' })
  @IsString()
  etag!: string;
}

export class CompleteDeliveryMultipartUploadDto {
  @ApiProperty({ example: 'order-deliveries/<orderId>/r0/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  @IsString()
  uploadId!: string;

  @ApiProperty({ type: [CompletedDeliveryPartDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(S3_MAX_PARTS)
  @ValidateNested({ each: true })
  @Type(() => CompletedDeliveryPartDto)
  parts!: CompletedDeliveryPartDto[];
}

export class CompleteDeliveryMultipartUploadResponseDto {
  @ApiProperty({ example: 'order-deliveries/<orderId>/r0/<uuid>.mp4' })
  key!: string;

  @ApiProperty({ example: 'https://cdn.example.com/order-deliveries/...mp4' })
  cdnUrl!: string;
}

export class AbortDeliveryMultipartUploadDto {
  @ApiProperty({ example: 'order-deliveries/<orderId>/r0/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  @IsString()
  uploadId!: string;
}
