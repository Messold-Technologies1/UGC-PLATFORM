import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

/** ~1 GiB — generous ceiling for a single portfolio/intro clip. */
export const PORTFOLIO_VIDEO_MAX_BYTES = 1024 * 1024 * 1024;

/** S3 hard limit: a multipart upload may have at most 10,000 parts. */
const S3_MAX_PARTS = 10_000;

export class CreateMultipartUploadDto extends PortfolioActingCreatorDto {
  @ApiProperty({ enum: ['video', 'thumbnail'], example: 'video' })
  @IsIn(['video', 'thumbnail'])
  kind!: 'video' | 'thumbnail';

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  contentType!: string;

  @ApiProperty({
    example: 734003200,
    description: `Total file size in bytes (max ${PORTFOLIO_VIDEO_MAX_BYTES}).`,
  })
  @IsInt()
  @Min(1)
  @Max(PORTFOLIO_VIDEO_MAX_BYTES)
  contentLength!: number;
}

export class CreateMultipartUploadResponseDto {
  @ApiProperty({ example: 'creator-portfolio/<creatorId>/videos/<uuid>.mp4' })
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  uploadId!: string;

  @ApiProperty({ example: 'https://cdn.example.com/creator-portfolio/...mp4' })
  cdnUrl!: string;

  @ApiProperty({ example: 10 * 1024 * 1024 })
  partSizeBytes!: number;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;
}

export class SignMultipartPartDto extends PortfolioActingCreatorDto {
  @ApiProperty({ example: 'creator-portfolio/<creatorId>/videos/<uuid>.mp4' })
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

export class SignMultipartPartResponseDto {
  @ApiProperty({ example: 'https://s3...signed...' })
  url!: string;
}

export class CompletedMultipartPartDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  @Max(S3_MAX_PARTS)
  partNumber!: number;

  @ApiProperty({ example: '"e868e0f4859b1b2c8e6f..."' })
  @IsString()
  etag!: string;
}

export class CompleteMultipartUploadDto extends PortfolioActingCreatorDto {
  @ApiProperty({ example: 'creator-portfolio/<creatorId>/videos/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  @IsString()
  uploadId!: string;

  @ApiProperty({ type: [CompletedMultipartPartDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(S3_MAX_PARTS)
  @ValidateNested({ each: true })
  @Type(() => CompletedMultipartPartDto)
  parts!: CompletedMultipartPartDto[];
}

export class CompleteMultipartUploadResponseDto {
  @ApiProperty({ example: 'creator-portfolio/<creatorId>/videos/<uuid>.mp4' })
  key!: string;

  @ApiProperty({ example: 'https://cdn.example.com/creator-portfolio/...mp4' })
  cdnUrl!: string;
}

export class AbortMultipartUploadDto extends PortfolioActingCreatorDto {
  @ApiProperty({ example: 'creator-portfolio/<creatorId>/videos/<uuid>.mp4' })
  @IsString()
  key!: string;

  @ApiProperty({ example: 'abc123.uploadId' })
  @IsString()
  uploadId!: string;
}
