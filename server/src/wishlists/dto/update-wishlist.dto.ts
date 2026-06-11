import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsOptional, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';

export class UpdateWishlistDto {
  @ApiPropertyOptional({ example: 'Q3 launch creators' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  name?: string;

  @ApiPropertyOptional({
    type: [String],
    description:
      'When provided, replaces the full creator list in this order (approved creators only)',
  })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsUUID('4', { each: true })
  creatorIds?: string[];
}
