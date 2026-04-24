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

export class PresignDeliveryUploadFileDto {
  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  contentType!: string;

  @ApiProperty({ example: 10_000_000 })
  @IsInt()
  @Min(1)
  @Max(250_000_000)
  contentLength!: number;

  @ApiProperty({ enum: ['video', 'image'] })
  @IsIn(['video', 'image'])
  kind!: 'video' | 'image';
}

export class PresignDeliveryUploadDto {
  @ApiProperty({ type: [PresignDeliveryUploadFileDto] })
  @IsArray()
  @ArrayMaxSize(10)
  files!: PresignDeliveryUploadFileDto[];
}

