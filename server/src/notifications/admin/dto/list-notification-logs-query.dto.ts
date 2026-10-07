import { ApiPropertyOptional } from '@nestjs/swagger';
import { NotificationChannel, NotificationLogStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

/**
 * Filters for the delivery log.
 *
 * A class rather than loose @Query() params, matching every other list endpoint
 * here. It is also what keeps the enum filters out of Swagger's object-literal
 * path: an enum-typed bare parameter emits the runtime enum OBJECT as its
 * design:type, which Swagger walks as a schema and then rejects as circular on
 * the first key, aborting document generation.
 */
export class ListNotificationLogsQueryDto {
  @ApiPropertyOptional({
    example: 'order-content-delivered-for-brand',
    description: 'Catalog key of the event that produced the send.',
  })
  @IsOptional()
  @IsString()
  eventKey?: string;

  @ApiPropertyOptional({
    description: 'The account the send was addressed to.',
  })
  @IsOptional()
  @IsUUID()
  recipientUserId?: string;

  @ApiPropertyOptional({ enum: NotificationLogStatus })
  @IsOptional()
  @IsEnum(NotificationLogStatus)
  status?: NotificationLogStatus;

  @ApiPropertyOptional({ enum: NotificationChannel })
  @IsOptional()
  @IsEnum(NotificationChannel)
  channel?: NotificationChannel;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  take?: number;

  @ApiPropertyOptional({ description: 'Log id to page from.' })
  @IsOptional()
  @IsUUID()
  cursor?: string;
}
