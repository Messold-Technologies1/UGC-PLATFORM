import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AddWishlistCreatorDto {
  @ApiProperty({ description: 'Creator profile id to add' })
  @IsUUID()
  creatorId!: string;
}
