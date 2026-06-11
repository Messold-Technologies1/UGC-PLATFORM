import { ApiProperty } from '@nestjs/swagger';

export class CreateWishlistResponseDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;
}
