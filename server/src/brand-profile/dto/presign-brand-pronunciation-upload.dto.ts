import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';


export const BRAND_PRONUNCIATION_AUDIO_MAX_BYTES = 5 * 1024 * 1024;

export class PresignBrandPronunciationUploadDto {
  @ApiProperty({
    example: 'audio/webm',
    description:
      'MIME type (e.g. audio/webm from MediaRecorder, audio/mp4 on Safari).',
  })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({
    example: 245_000,
    description: 'File size in bytes (recommended; max 5 MB).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(BRAND_PRONUNCIATION_AUDIO_MAX_BYTES)
  contentLength?: number;
}
