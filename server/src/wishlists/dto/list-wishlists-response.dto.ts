import { ApiProperty } from '@nestjs/swagger';
import { WishlistDto } from './wishlist.dto';

export class ListWishlistsResponseDto {
  @ApiProperty({ type: () => [WishlistDto] })
  items!: WishlistDto[];
}
