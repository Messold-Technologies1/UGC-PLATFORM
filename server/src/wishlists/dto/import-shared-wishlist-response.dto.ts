import { ApiProperty } from '@nestjs/swagger';

export class ImportSharedWishlistResponseDto {
  @ApiProperty({ example: 'uuid' })
  wishlistId!: string;

  @ApiProperty({ example: 5 })
  addedCount!: number;

  @ApiProperty({ example: 2 })
  skippedCount!: number;
}
