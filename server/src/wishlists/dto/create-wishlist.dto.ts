import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class CreateWishlistDto {
  @ApiProperty({ example: 'Summer campaign shortlist' })
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Optional initial creator profile ids (approved creators only)',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  creatorIds?: string[];

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
