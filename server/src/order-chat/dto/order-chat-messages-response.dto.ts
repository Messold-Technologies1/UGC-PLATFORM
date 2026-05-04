import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderChatMessageDto } from './order-chat-message.dto';

export class OrderChatMessagesResponseDto {
  @ApiProperty({ type: () => [OrderChatMessageDto] })
  items!: OrderChatMessageDto[];

  @ApiPropertyOptional({
    description: 'Cursor for the next page (pass as `cursor`).',
  })
  nextCursor?: string;
}

