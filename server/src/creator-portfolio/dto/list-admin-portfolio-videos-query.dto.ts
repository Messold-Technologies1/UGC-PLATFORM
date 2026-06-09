import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class ListAdminPortfolioVideosQueryDto {
  @ApiPropertyOptional({
    example: 'a505e890-eb10-48b4-920e-4a1c24f0b1f8',
    description:
      'Optional creator profile id. When omitted, returns portfolio videos for all creators.',
  })
  @IsOptional()
  @IsUUID()
  creatorId?: string;
}
