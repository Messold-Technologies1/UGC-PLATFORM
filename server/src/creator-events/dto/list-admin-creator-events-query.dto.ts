import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { ListCreatorEventsQueryDto } from './list-creator-events-query.dto';

export const ADMIN_EVENT_STATUSES = ['all', 'visible', 'hidden'] as const;
export type AdminEventStatus = (typeof ADMIN_EVENT_STATUSES)[number];

export class ListAdminCreatorEventsQueryDto extends ListCreatorEventsQueryDto {
  @ApiPropertyOptional({ enum: ADMIN_EVENT_STATUSES, default: 'all' })
  @IsOptional()
  @IsIn(ADMIN_EVENT_STATUSES)
  status?: AdminEventStatus;

  @ApiPropertyOptional({
    description: "Matches post text or the creator's public slug.",
    maxLength: 120,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MaxLength(120)
  search?: string;
}
