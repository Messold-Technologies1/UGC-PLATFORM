import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class UpsertCreatorUnavailabilityDto {
  @ApiProperty({
    example: '2026-08-10',
    description: 'First unavailable day (inclusive), ISO date YYYY-MM-DD',
  })
  @IsDateString()
  startsOn!: string;

  @ApiProperty({
    example: '2026-08-20',
    description: 'Last unavailable day (inclusive), ISO date YYYY-MM-DD',
  })
  @IsDateString()
  endsOn!: string;
}

export class CreatorUnavailabilityDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ example: '2026-08-10' })
  startsOn!: string;

  @ApiProperty({ example: '2026-08-20' })
  endsOn!: string;

  @ApiProperty({
    example: false,
    description:
      'True when today falls within [startsOn, endsOn]. Future schedules stay available until startsOn.',
  })
  isCurrentlyUnavailable!: boolean;
}

export class CreatorAvailabilityPublicDto {
  @ApiProperty({
    example: true,
    description:
      'True when the creator has no unavailability covering today (default available).',
  })
  available!: boolean;

  @ApiPropertyOptional({
    example: '2026-08-10',
    nullable: true,
    description: 'Present when a schedule exists (active or upcoming).',
  })
  startsOn?: string | null;

  @ApiPropertyOptional({
    example: '2026-08-20',
    nullable: true,
  })
  endsOn?: string | null;
}
