import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreatorPublicListItemDto } from '../../creator-profile/dto/creator-public-list-item.dto';

export class WishlistCreatorAddOnDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Extra Revision' })
  name!: string;

  @ApiProperty({ example: '499.00', description: 'Add-on price (string decimal)' })
  priceAmount!: string;

  @ApiPropertyOptional({ example: 'One additional revision cycle' })
  description?: string | null;
}

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

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}

/**
 * A wishlist creator, enriched with everything the bulk-checkout flow needs:
 * the creator's available add-ons and the add-ons the brand pre-selected for
 * this creator when saving them (or [] if none were chosen yet).
 */
export class WishlistCreatorItemDto extends CreatorPublicListItemDto {
  @ApiProperty({ type: () => [WishlistCreatorAddOnDto] })
  addOns!: WishlistCreatorAddOnDto[];

  @ApiProperty({
    type: [String],
    description:
      "Add-on ids the brand pre-selected for this creator (subset of `addOns`). Empty if none chosen at save time — the brand can pick at checkout.",
  })
  selectedAddOnIds!: string[];
}

export class WishlistDetailDto extends WishlistDto {
  @ApiProperty({ type: () => [WishlistCreatorItemDto] })
  creators!: WishlistCreatorItemDto[];
}
