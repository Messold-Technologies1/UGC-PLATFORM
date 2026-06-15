import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorPublicListItemDto } from '../../creator-profile/dto/creator-public-list-item.dto';

export class PublicWishlistBrandDto {
  @ApiProperty({ example: 'Acme Co' })
  brandName!: string;

  @ApiPropertyOptional()
  logoUrl?: string | null;

  @ApiPropertyOptional()
  contactFullName?: string | null;
}

export class PublicWishlistResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Summer campaign shortlist' })
  name!: string;

  @ApiProperty({ type: () => PublicWishlistBrandDto })
  brand!: PublicWishlistBrandDto;

  @ApiProperty({ type: () => [CreatorPublicListItemDto] })
  creators!: CreatorPublicListItemDto[];
}
