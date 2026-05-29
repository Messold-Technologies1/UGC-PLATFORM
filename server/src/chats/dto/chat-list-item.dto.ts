import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { ChatBrandCounterpartyDto } from './chat-counterparty.dto';
import { ChatCreatorCounterpartyDto } from './chat-counterparty.dto';
import { ChatLastMessageDto } from './chat-last-message.dto';

export class CreatorChatListItemDto {
  @ApiProperty({ description: 'Order id (one chat thread per order).' })
  orderId!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  packageName!: string;

  @ApiProperty()
  isChatLocked!: boolean;

  @ApiProperty({ type: ChatBrandCounterpartyDto })
  brand!: ChatBrandCounterpartyDto;

  @ApiPropertyOptional({ type: ChatLastMessageDto })
  lastMessage?: ChatLastMessageDto;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty()
  updatedAt!: string;
}

export class BrandChatListItemDto {
  @ApiProperty({ description: 'Order id (one chat thread per order).' })
  orderId!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty()
  packageName!: string;

  @ApiProperty()
  isChatLocked!: boolean;

  @ApiProperty({ type: ChatCreatorCounterpartyDto })
  creator!: ChatCreatorCounterpartyDto;

  @ApiPropertyOptional({ type: ChatLastMessageDto })
  lastMessage?: ChatLastMessageDto;

  @ApiProperty()
  unreadCount!: number;

  @ApiProperty()
  updatedAt!: string;
}
