import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';

/** Optional creator profile id when an admin acts on another creator's portfolio. */
export class PortfolioActingCreatorDto {
  @ApiPropertyOptional({
    example: 'a505e890-eb10-48b4-920e-4a1c24f0b1f8',
    description:
      'Creator profile id to act on. Required when the authenticated user is not the portfolio owner (e.g. admin). Owners may omit this.',
  })
  @IsOptional()
  @IsUUID()
  creatorId?: string;
}
