import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { ORDER_CHAT_VOICE_MAX_DURATION_MS } from '../order-chat.constants';

export class SendOrderChatVoiceMessageDto {
  @ApiProperty({
    description:
      'S3 object key from POST .../chat/messages/presign-voice (after uploading the audio).',
  })
  @IsString()
  @MaxLength(512)
  audioKey!: string;

  @ApiProperty({
    example: 12_400,
    description: 'Recorded duration in milliseconds.',
  })
  @IsInt()
  @Min(1)
  @Max(ORDER_CHAT_VOICE_MAX_DURATION_MS)
  audioDurationMs!: number;

  @ApiPropertyOptional({
    description:
      'Client-generated id for idempotent retries (same sender + order).',
  })
  @IsOptional()
  @IsString()
  @MaxLength(128)
  clientMessageId?: string;
}
