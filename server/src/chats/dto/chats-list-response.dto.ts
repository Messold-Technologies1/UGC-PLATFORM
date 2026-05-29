import { ApiProperty } from '@nestjs/swagger';
import { BrandChatListItemDto, CreatorChatListItemDto } from './chat-list-item.dto';

export class CreatorChatsListResponseDto {
  @ApiProperty({ type: [CreatorChatListItemDto] })
  items!: CreatorChatListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}

export class BrandChatsListResponseDto {
  @ApiProperty({ type: [BrandChatListItemDto] })
  items!: BrandChatListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
