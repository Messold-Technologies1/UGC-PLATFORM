import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderChatStateDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  brandUserId!: string;

  @ApiProperty()
  creatorUserId!: string;

  @ApiProperty({
    description:
      'False until the creator accepts the brief. Participants cannot send messages until then.',
  })
  isChatWritable!: boolean;

  @ApiPropertyOptional()
  brandLastReadMessageId?: string;

  @ApiPropertyOptional()
  brandLastReadAt?: string;

  @ApiPropertyOptional()
  creatorLastReadMessageId?: string;

  @ApiPropertyOptional()
  creatorLastReadAt?: string;
}

