import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

export class CreatePortfolioSectionDto extends PortfolioActingCreatorDto {
  @ApiProperty({
    example: 'Testimonials',
    description: 'Display name of the portfolio section.',
    maxLength: 100,
  })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  name!: string;

  @ApiPropertyOptional({
    example: 0,
    description: 'Display order position (0-based). Defaults to 0 if omitted.',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
