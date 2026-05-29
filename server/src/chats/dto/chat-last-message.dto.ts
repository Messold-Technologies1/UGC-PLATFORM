import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderChatMessageType } from '@prisma/client';

export class ChatLastMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  senderUserId!: string;

  @ApiProperty({ enum: OrderChatMessageType })
  type!: OrderChatMessageType;

  @ApiPropertyOptional({
    description: 'Preview text for TEXT messages; null for voice-only.',
  })
  previewText?: string | null;

  @ApiProperty()
  createdAt!: string;
}
