import { ApiProperty } from '@nestjs/swagger';
import { CreatorFacetDimension } from '@prisma/client';
import { IsEnum, IsString, Matches } from 'class-validator';

export class CreatorFacetSelectionInputDto {
  @ApiProperty({
    enum: CreatorFacetDimension,
    example: CreatorFacetDimension.CONTENT_CATEGORY,
  })
  @IsEnum(CreatorFacetDimension)
  dimension!: CreatorFacetDimension;

  @ApiProperty({ example: 'solo_individual' })
  @IsString()
  @Matches(/^[a-z0-9_]+$/)
  slug!: string;
}
