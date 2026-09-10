import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

/**
 * Body for an admin ending an order on a party's behalf (reject the brief on the
 * creator's behalf, or cancel on the brand's behalf). The reason note is
 * required and is shown to both parties in the support cancellation email.
 */
export class AdminBriefActionDto {
  @ApiProperty({
    description:
      "Reason support is rejecting/cancelling on the party's behalf (required)",
    maxLength: 2000,
    example: "Cancelled at the brand's request over email.",
  })
  @IsString()
  @MinLength(3)
  @MaxLength(2000)
  note!: string;
}
