import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import {
  CREATOR_EVENT_MAX_PAGE_SIZE,
  CREATOR_EVENT_PAGE_SIZE,
} from '../creator-events.constants';

export class ListCreatorEventsQueryDto {
  @ApiPropertyOptional({
    default: CREATOR_EVENT_PAGE_SIZE,
    minimum: 1,
    maximum: CREATOR_EVENT_MAX_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(CREATOR_EVENT_MAX_PAGE_SIZE)
  limit?: number;

  @ApiPropertyOptional({
    description:
      'Id of the last post on the previous page. Keyset, not offset: a post published mid-scroll never pushes a row onto the next page twice.',
  })
  @IsOptional()
  @IsString()
  cursor?: string;
}
