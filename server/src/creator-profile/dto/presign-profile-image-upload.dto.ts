import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';

/** ~10 MiB — profile headshots only. */
const PROFILE_IMAGE_MAX_BYTES = 10 * 1024 * 1024;

export class PresignProfileImageUploadDto {
  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type: image/jpeg, image/png, or image/webp.',
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
    example: 512_000,
    description: `Optional file size in bytes (max ${PROFILE_IMAGE_MAX_BYTES}).`,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(PROFILE_IMAGE_MAX_BYTES)
  contentLength?: number;
}

export class PresignProfileImageUploadResponseDto {
  @ApiProperty({
    example: 'creator-profile/<profileId>/profile-image/<uuid>.jpg',
    description: 'S3 object key for the profile image upload.',
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

  @ApiProperty({
    example: 'https://cdn.example.com/creator-profile/<profileId>/profile-image/<uuid>.jpg',
  })
  cdnUrl!: string;
}
