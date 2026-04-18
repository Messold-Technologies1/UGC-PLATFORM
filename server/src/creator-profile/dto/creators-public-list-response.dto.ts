import { ApiProperty } from '@nestjs/swagger';
import { CreatorPublicListItemDto } from './creator-public-list-item.dto';

export class CreatorsPublicListResponseDto {
  @ApiProperty({ type: () => [CreatorPublicListItemDto] })
  items!: CreatorPublicListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 20 })
  limit!: number;
}

