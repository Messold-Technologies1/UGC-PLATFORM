import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PresignDemoVideoUploadDto {
  @ApiProperty({ enum: ['video', 'thumbnail'], example: 'video' })
  @IsIn(['video', 'thumbnail'])
  kind!: 'video' | 'thumbnail';

  @ApiProperty({ example: 'video/mp4' })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({ example: 123456 })
  @IsOptional()
  @IsInt()
  @Min(1)
  contentLength?: number;
}

export class PresignDemoVideoUploadResponseDto {
  @ApiProperty({ example: 'creator-demo-videos/<uuid>.mp4' })
  key!: string;

  @ApiProperty({ example: 'https://s3...signed...' })
  uploadUrl!: string;

  @ApiProperty({
    example: { 'Content-Type': 'video/mp4' },
    additionalProperties: { type: 'string' },
  })
  headers!: Record<string, string>;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;

  @ApiProperty({ example: 'https://cdn.example.com/creator-demo-videos/...mp4' })
  cdnUrl!: string;
}
