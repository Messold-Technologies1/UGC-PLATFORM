import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

export class UpdatePortfolioSectionDto extends PortfolioActingCreatorDto {
  @ApiPropertyOptional({
    example: 'Product Demos',
    description: 'Updated display name of the portfolio section.',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({
    example: 2,
    description: 'Updated display order position (0-based).',
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  position?: number;
}
