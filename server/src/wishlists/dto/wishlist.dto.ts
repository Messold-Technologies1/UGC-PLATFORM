import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorPublicListItemDto } from '../../creator-profile/dto/creator-public-list-item.dto';

export class WishlistDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Summer campaign shortlist' })
  name!: string;

  @ApiProperty({ example: 5 })
  creatorCount!: number;

  @ApiProperty({ type: [String] })
  creatorIds!: string[];

  @ApiProperty()
  shareEnabled!: boolean;

  @ApiPropertyOptional({
    description: 'Present when sharing has been enabled at least once',
  })
  shareToken?: string | null;

  @ApiPropertyOptional()
  sharedAt?: Date | null;

  @ApiProperty({ type: [String] })
  creatorIds!: string[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class WishlistDetailDto extends WishlistDto {
  @ApiProperty({ type: () => [CreatorPublicListItemDto] })
  creators!: CreatorPublicListItemDto[];
}
