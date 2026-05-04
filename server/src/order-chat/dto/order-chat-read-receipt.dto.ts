import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderChatReadReceiptDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  userId!: string;

  @ApiPropertyOptional({ nullable: true })
  lastReadMessageId?: string | null;

  @ApiPropertyOptional({ nullable: true })
  lastReadAt?: string | null;
}

