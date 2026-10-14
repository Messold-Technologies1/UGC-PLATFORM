import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

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

  /**
   * Meta attribution cookies read in the user's own browser. Used only to match
   * the AddToWishlist conversion sent via the Conversions API; never stored.
   */
  @ApiPropertyOptional({ description: 'Meta _fbp browser cookie' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  metaFbp?: string;

  @ApiPropertyOptional({ description: 'Meta _fbc ad-click cookie' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  metaFbc?: string;
}
