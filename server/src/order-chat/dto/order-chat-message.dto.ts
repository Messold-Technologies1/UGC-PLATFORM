import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderChatMessageType } from '@prisma/client';

export class OrderChatMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  senderUserId!: string;

  @ApiProperty({ enum: OrderChatMessageType })
  type!: OrderChatMessageType;

  @ApiPropertyOptional({
    description: 'Present for TEXT messages; null for VOICE-only messages.',
  })
  text?: string | null;

  @ApiPropertyOptional({
    description: 'CDN URL for VOICE messages; null for TEXT-only messages.',
  })
  audioUrl?: string | null;

  @ApiPropertyOptional({ description: 'Duration in ms for VOICE messages.' })
  audioDurationMs?: number | null;

  @ApiPropertyOptional({ description: 'MIME type for VOICE messages.' })
  audioMimeType?: string | null;

  @ApiPropertyOptional()
  clientMessageId?: string | null;

  @ApiProperty()
  createdAt!: string;
}
