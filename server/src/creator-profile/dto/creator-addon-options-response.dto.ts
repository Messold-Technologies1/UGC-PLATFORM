import { ApiProperty } from '@nestjs/swagger';

export class CreatorAddOnOptionItemDto {
  @ApiProperty({ example: 'extra_revision' })
  slug!: string;

  @ApiProperty({ example: 'Extra Revision' })
  name!: string;

  @ApiProperty({ example: 0 })
  sortOrder!: number;

  @ApiProperty({ example: 500, required: false, nullable: true })
  fixedPrice?: number | null;

  @ApiProperty({ example: 100, required: false, nullable: true })
  minPrice?: number | null;

  @ApiProperty({ example: 100, required: false, nullable: true })
  stepPrice?: number | null;
}

export class CreatorAddOnOptionsResponseDto {
  @ApiProperty({ type: [CreatorAddOnOptionItemDto] })
  options!: CreatorAddOnOptionItemDto[];
}

