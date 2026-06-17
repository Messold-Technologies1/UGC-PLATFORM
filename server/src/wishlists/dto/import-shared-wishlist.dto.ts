import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUUID, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class ImportSharedWishlistDto {
  @ApiPropertyOptional({ description: 'Existing wishlist id to add creators into' })
  @ValidateIf((o) => !o.name)
  @IsUUID('4')
  wishlistId?: string;

  @ApiPropertyOptional({
    example: 'Summer campaign shortlist (imported)',
    description: 'Create a new wishlist with this name and add all creators',
  })
  @ValidateIf((o) => !o.wishlistId)
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;
}
