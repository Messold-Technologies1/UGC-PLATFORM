import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PresignBriefProductImageUploadDto {
  @ApiProperty({
    example: 'image/png',
    description: 'MIME type of the product image being uploaded to S3.',
  })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({
    example: 524288,
    description: 'Optional file size in bytes (used for validation).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  contentLength?: number;
}

export class PresignBriefProductImageUploadResponseDto {
  @ApiProperty({
    example: 'brief-product-temp/<userId>/<uuid>.png',
    description:
      'Temporary key from presign; finalized to brief-product/<briefId>/... when the brief is created.',
  })
  key!: string;

  @ApiProperty({ example: 'https://s3...signed...' })
  uploadUrl!: string;

  @ApiProperty({
    example: { 'Content-Type': 'image/png' },
    additionalProperties: { type: 'string' },
  })
  headers!: Record<string, string>;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;

  @ApiProperty({ example: 'https://cdn.example.com/brief-product-temp/...png' })
  cdnUrl!: string;
}
