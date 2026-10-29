import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { UpdateBriefDto } from './update-brief.dto';

/**
 * Edit the brief on one order and resubmit it, while the creator has still not
 * accepted. Carries the same optional fields as a normal brief update, plus the
 * order the edit is for — a saved brief can sit on several orders at once, and
 * only this one is being revised.
 */
export class ReviseBriefForOrderDto extends UpdateBriefDto {
  @ApiProperty({
    description:
      'The order whose brief is being revised. Must be awaiting the creator’s response (BRIEF_SUBMITTED) and must currently carry this brief.',
    example: 'uuid',
  })
  @IsUUID()
  orderId!: string;
}
