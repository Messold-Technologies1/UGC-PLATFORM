import { ApiProperty } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsString,
  Max,
  Min,
} from 'class-validator';

/**
 * Hard cap on a single delivery asset. Files above the client's multipart
 * threshold upload in parts, so this ceiling applies to both upload paths and
 * is the one number to change if the limit ever moves again.
 */
export const DELIVERY_ASSET_MAX_BYTES = 500 * 1024 * 1024; // 500 MiB

/** S3 hard limit: a multipart upload may have at most 10,000 parts. */
export const S3_MAX_PARTS = 10_000;

/** Max assets in a single delivery submission. */
export const DELIVERY_MAX_FILES = 10;

export class PresignDeliveryUploadFileDto {
  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  contentType!: string;

  @ApiProperty({ example: 10_000_000 })
  @IsInt()
  @Min(1)
  @Max(DELIVERY_ASSET_MAX_BYTES)
  contentLength!: number;

  @ApiProperty({ enum: ['video', 'image'] })
  @IsIn(['video', 'image'])
  kind!: 'video' | 'image';
}

export class PresignDeliveryUploadDto {
  @ApiProperty({ type: [PresignDeliveryUploadFileDto] })
  @IsArray()
  @ArrayMaxSize(DELIVERY_MAX_FILES)
  files!: PresignDeliveryUploadFileDto[];
}
