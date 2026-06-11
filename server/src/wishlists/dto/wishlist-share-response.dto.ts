import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class WishlistShareResponseDto {
  @ApiProperty()
  shareEnabled!: boolean;

  @ApiProperty({ description: 'Opaque token for the public share URL' })
  shareToken!: string;

  @ApiPropertyOptional()
  sharedAt?: Date | null;
}
