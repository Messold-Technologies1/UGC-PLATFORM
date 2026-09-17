import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

/** Query for the lightweight "first order free" creator picker (listed only). */
export class FirstOrderFreeCreatorsQueryDto {
  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 12 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ example: 'jane' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;
}

/** Slim card row — only what the toggle grid renders. */
export class FirstOrderFreeCreatorListItemDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: 'Jane Doe' })
  displayName!: string;

  @ApiPropertyOptional({ example: 'Bengaluru', nullable: true })
  city?: string | null;

  @ApiPropertyOptional({ nullable: true })
  profileImageUrl?: string | null;

  @ApiPropertyOptional({ example: 'Food', nullable: true })
  primaryCategory?: string | null;

  @ApiProperty({ example: false })
  firstOrderFreeEnabled!: boolean;
}

export class FirstOrderFreeCreatorsListResponseDto {
  @ApiProperty({ type: [FirstOrderFreeCreatorListItemDto] })
  items!: FirstOrderFreeCreatorListItemDto[];

  @ApiProperty({ example: 42 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 12 })
  limit!: number;
}
