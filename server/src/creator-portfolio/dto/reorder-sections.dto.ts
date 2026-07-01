import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsArray,
  IsInt,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

export class ReorderSectionItemDto {
  @ApiProperty({ example: 'a505e890-eb10-48b4-920e-4a1c24f0b1f8' })
  @IsUUID()
  id!: string;

  @ApiProperty({ example: 0, description: 'New display order position.' })
  @IsInt()
  @Min(0)
  position!: number;
}

export class ReorderSectionsDto extends PortfolioActingCreatorDto {
  @ApiProperty({
    type: [ReorderSectionItemDto],
    description:
      'Array of section IDs with their new positions. All sections owned by the creator should be included.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => ReorderSectionItemDto)
  sections!: ReorderSectionItemDto[];
}
