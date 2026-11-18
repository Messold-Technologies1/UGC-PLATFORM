import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { CREATOR_EVENT_MAX_LENGTH } from '../creator-events.constants';

/**
 * Trim before validating, so a body of nothing but spaces fails MinLength
 * instead of being stored as a blank post.
 */
const trimBody = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

/**
 * An empty string from a cleared date input means "no date", not an invalid
 * one — the form posts "" rather than omitting the field.
 */
const emptyToUndefined = ({ value }: { value: unknown }) => {
  if (typeof value !== 'string') return value;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

export class CreateCreatorEventDto {
  @ApiProperty({
    maxLength: CREATOR_EVENT_MAX_LENGTH,
    example:
      "Heading to Jaipur on Tuesday for my cousin's wedding — carrying my ring light, so I can shoot festive content all week.",
  })
  @Transform(trimBody)
  @IsString()
  @MinLength(1)
  @MaxLength(CREATOR_EVENT_MAX_LENGTH)
  body!: string;

  @ApiPropertyOptional({
    example: '2026-11-20',
    description:
      'Calendar date the thing starts. Does not affect visibility — a post about next week is useful before it starts.',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(DATE_ONLY, { message: 'startsOn must be a YYYY-MM-DD date' })
  startsOn?: string;

  @ApiPropertyOptional({
    example: '2026-11-28',
    description:
      'Calendar date the thing ends. Once it is past, the post drops out of the brand feed. Omit for a post that should not expire.',
  })
  @IsOptional()
  @Transform(emptyToUndefined)
  @IsString()
  @Matches(DATE_ONLY, { message: 'endsOn must be a YYYY-MM-DD date' })
  endsOn?: string;
}
