import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class OrderListSummaryDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ example: 'Basic package' })
  packageNameSnapshot!: string;

  @ApiProperty({ example: '199.99' })
  priceAmountSnapshot!: string;

  @ApiProperty({
    example: 19999,
    description:
      'Grand total in paise (package + add-ons). Use for creator est. payout after platform fee.',
  })
  expectedAmountPaise!: number;

  @ApiProperty({ example: 'INR' })
  currency!: string;

  @ApiProperty({ example: 7 })
  deliveryDaysSnapshot!: number;

  @ApiPropertyOptional()
  paidAt?: Date | null;

  @ApiPropertyOptional()
  briefSubmittedAt?: Date | null;

  @ApiPropertyOptional()
  briefAcceptedAt?: Date | null;

  @ApiProperty({
    description:
      'True when the brief required shipping a physical product to the creator',
  })
  requiresPhysicalProductShipment!: boolean;

  @ApiProperty({ example: true })
  hasBrief!: boolean;

  @ApiPropertyOptional({
    example: 'uuid',
    description:
      'Saved brief id when hasBrief is true; use GET /briefs/:id (brand) or GET /orders/:id/brief.',
  })
  briefId?: string;

  @ApiPropertyOptional({
    description: 'Promised delivery due date (deliveryDaysSnapshot from clock start)',
  })
  deliveryDueAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Final delivery cutoff after the grace period',
  })
  deliveryGraceDeadlineAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'When the order was refunded (REFUNDED status)',
  })
  refundedAt?: Date | null;

  @ApiPropertyOptional({
    description: 'When the latest dispute was opened (for Disputed on)',
  })
  disputeOpenedAt?: Date | null;

  @ApiPropertyOptional({
    description:
      'When the latest dispute was resolved (for Rejected on after dispute resolution)',
  })
  disputeResolvedAt?: Date | null;
}
