import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export class PresignProfileImageUploadDto {
  @ApiProperty({
    example: 'image/jpeg',
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
    example: 'creator-profile-temp/<userId>/<uuid>.jpg',
    description:
      'Before profile creation this is a temporary key. It is finalized to creator-profile/<creatorId>/... during create.',
  })
  key!: string;

  @ApiProperty({ example: 'https://s3...signed...' })
  uploadUrl!: string;

  @ApiProperty({
    example: { 'Content-Type': 'image/jpeg' },
    additionalProperties: { type: 'string' },
  })
  headers!: Record<string, string>;

  @ApiProperty({ example: 900 })
  expiresInSeconds!: number;

  @ApiProperty({ example: 'https://cdn.example.com/creator-profile/...jpg' })
  cdnUrl!: string;
}

