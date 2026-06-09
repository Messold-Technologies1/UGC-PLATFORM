import { ApiPropertyOptional } from '@nestjs/swagger';
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString } from 'class-validator';
import { PortfolioActingCreatorDto } from './portfolio-acting-creator.dto';

export class UpdatePortfolioVideoDto extends PortfolioActingCreatorDto {
  @ApiPropertyOptional({ example: 'gym' })
  @IsOptional()
  @IsString()
  industryLabel?: string;

  @ApiPropertyOptional({ example: ['testimonial', 'talking head'], type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  tags?: string[];

  @ApiPropertyOptional({ example: 'English' })
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional({ example: 'Updated description.' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ enum: ['public', 'private'] })
  @IsOptional()
  @IsIn(['public', 'private'])
  visibilityStatus?: 'public' | 'private';
}

