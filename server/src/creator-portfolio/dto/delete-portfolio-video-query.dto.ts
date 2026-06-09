import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

export class DeletePortfolioVideoQueryDto {
  @ApiPropertyOptional({
    example: 'a505e890-eb10-48b4-920e-4a1c24f0b1f8',
    description:
      'Creator profile id when an admin deletes on behalf of a creator.',
  })
  @IsOptional()
  @IsUUID()
  creatorId?: string;
}
