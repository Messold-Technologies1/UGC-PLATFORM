import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PresignBrandLogoUploadDto {
  @ApiProperty({
    example: 'image/png',
    description: 'MIME type of the file being uploaded to S3.',
  })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({
    example: 123456,
    description: 'Optional file size in bytes (used for validation).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  contentLength?: number;
}

export class PresignUploadResponseDto {
  @ApiProperty({
    example: 'brand-logo-temp/<userId>/<uuid>.png',
    description:
      'Before profile creation this is a temporary key. It is finalized to brand-logo/<brandProfileId>/... during create.',
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

  @ApiProperty({ example: 'https://cdn.example.com/brand-logo/...png' })
  cdnUrl!: string;
}
