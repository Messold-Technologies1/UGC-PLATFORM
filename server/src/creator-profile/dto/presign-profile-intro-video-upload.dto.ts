import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/** ~200 MiB — adjust if product needs larger intros. */
const INTRO_VIDEO_MAX_BYTES = 200 * 1024 * 1024;

export class PresignProfileIntroVideoUploadDto {
  @ApiProperty({
    example: 'video/mp4',
    description: 'MIME type: video/mp4, video/quicktime, or video/webm.',
  })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({
    example: 'a505e890-eb10-48b4-920e-4a1c24f0b1f8',
    description:
      'Creator profile id to upload for. Required when the authenticated user is not the profile owner (e.g. admin). Owners may omit this to use their own profile.',
  })
  @IsOptional()
  @IsUUID()
  creatorProfileId?: string;

  @ApiPropertyOptional({
    example: 12_345_678,
    description: `Optional file size in bytes (max ${INTRO_VIDEO_MAX_BYTES}).`,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(INTRO_VIDEO_MAX_BYTES)
  contentLength?: number;
}

export class PresignUploadResponseDto {
  @ApiProperty({
    example: 'creator-profile/<profileId>/intro/<uuid>.mp4',
    description: 'S3 object key for the intro video upload.',
  })
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

  @ApiProperty({ example: 'https://cdn.example.com/creator-profile/...mp4' })
  cdnUrl!: string;
}
