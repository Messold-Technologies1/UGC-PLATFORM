import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderChatMessageDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  senderUserId!: string;

  @ApiProperty()
  text!: string;

  @ApiPropertyOptional()
  clientMessageId?: string | null;

  @ApiProperty()
  createdAt!: string;
}

