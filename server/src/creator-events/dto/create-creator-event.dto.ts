import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { CREATOR_EVENT_MAX_LENGTH } from '../creator-events.constants';

/**
 * Trim before validating, so a body of nothing but spaces fails MinLength
 * instead of being stored as a blank post.
 */
const trimBody = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

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
}
