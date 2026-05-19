import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { ORDER_CHAT_VOICE_MAX_BYTES } from '../order-chat.constants';

export class PresignOrderChatVoiceUploadDto {
  @ApiProperty({
    example: 'audio/webm',
    description:
      'MIME type (e.g. audio/webm from MediaRecorder, audio/mp4 on Safari).',
  })
  @IsString()
  contentType!: string;

  @ApiPropertyOptional({
    example: 245_000,
    description: 'File size in bytes (recommended; max 10 MB).',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(ORDER_CHAT_VOICE_MAX_BYTES)
  contentLength?: number;
}
