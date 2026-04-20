import { ApiProperty } from '@nestjs/swagger';
import { CreatorOrderListItemDto } from './creator-order-list-item.dto';

export class CreatorOrdersListResponseDto {
  @ApiProperty({ type: () => [CreatorOrderListItemDto] })
  items!: CreatorOrderListItemDto[];

  @ApiProperty()
  total!: number;

  @ApiProperty()
  page!: number;

  @ApiProperty()
  limit!: number;
}
