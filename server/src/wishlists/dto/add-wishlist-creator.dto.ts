import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayMaxSize, ArrayUnique, IsArray, IsOptional, IsUUID } from 'class-validator';

export class AddWishlistCreatorDto {
  @ApiProperty({ description: 'Creator profile id to add' })
  @IsUUID()
  creatorId!: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'Optional add-ons to pre-select for this creator (must belong to the creator). Stored on the wishlist entry and re-validated at checkout.',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsUUID('4', { each: true })
  addOnIds?: string[];
}
