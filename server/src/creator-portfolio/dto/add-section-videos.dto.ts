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

export class SectionVideoItemDto {
  @ApiProperty({ example: 'a505e890-eb10-48b4-920e-4a1c24f0b1f8' })
  @IsUUID()
  videoId!: string;

  @ApiProperty({ example: 0, description: 'Display order within the section.' })
  @IsInt()
  @Min(0)
  position!: number;
}

export class AddSectionVideosDto extends PortfolioActingCreatorDto {
  @ApiProperty({
    type: [SectionVideoItemDto],
    description: 'Videos to add/upsert into the section with their positions.',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => SectionVideoItemDto)
  videos!: SectionVideoItemDto[];
}
