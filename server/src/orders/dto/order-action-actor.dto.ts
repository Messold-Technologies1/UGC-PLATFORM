import { ApiProperty } from '@nestjs/swagger';

/**
 * Who performed a brief-stage action on an order (admin views only — never
 * exposed to brand/creator responses). `role` distinguishes a support action
 * (ADMIN) from the party acting themselves; for a termination the attributed
 * side is carried separately by order.cancelledBy.
 */
export class OrderActionActorDto {
  @ApiProperty({ description: 'Display name (falls back to email)' })
  name!: string;

  @ApiProperty({
    description:
      "The acting user's role: 'ADMIN' (support), 'CREATOR', 'BRAND' or 'AGENCY'",
    example: 'ADMIN',
  })
  role!: string;
}
