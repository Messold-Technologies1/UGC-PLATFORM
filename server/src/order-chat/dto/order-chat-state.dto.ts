import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderChatStateDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  brandUserId!: string;

  @ApiProperty()
  creatorUserId!: string;

  @ApiPropertyOptional()
  brandLastReadMessageId?: string;

  @ApiPropertyOptional()
  brandLastReadAt?: string;

  @ApiPropertyOptional()
  creatorLastReadMessageId?: string;

  @ApiPropertyOptional()
  creatorLastReadAt?: string;
}

