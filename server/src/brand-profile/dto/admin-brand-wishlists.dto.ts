import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AdminBrandWishlistCreatorDto {
  @ApiProperty({ example: 'creator-profile-uuid' })
  id!: string;

  @ApiPropertyOptional({ example: 'Rhea Kapoor', nullable: true })
  displayName!: string | null;

  @ApiPropertyOptional({ nullable: true })
  profileImageUrl!: string | null;

  @ApiPropertyOptional({ example: 'Mumbai', nullable: true })
  city!: string | null;
}

export class AdminBrandWishlistDto {
  @ApiProperty({ example: 'wishlist-uuid' })
  id!: string;

  @ApiProperty({ example: 'Diwali campaign shortlist' })
  name!: string;

  @ApiProperty({ example: 4 })
  creatorCount!: number;

  @ApiProperty({ example: false })
  shareEnabled!: boolean;

  @ApiProperty({ type: () => [AdminBrandWishlistCreatorDto] })
  creators!: AdminBrandWishlistCreatorDto[];

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

export class AdminBrandWishlistsResponseDto {
  @ApiProperty({ type: () => [AdminBrandWishlistDto] })
  items!: AdminBrandWishlistDto[];
}
