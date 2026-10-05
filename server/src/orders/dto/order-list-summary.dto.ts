import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderDisputeOpenedBy, OrderStatus } from '@prisma/client';
import { OrderCurrentRevisionDto } from './order-details-public.dto';

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
    description:
      'Promised delivery due date (deliveryDaysSnapshot from clock start)',
  })
  deliveryDueAt?: Date | null;

  @ApiPropertyOptional({
    description: 'Final delivery cutoff after the grace period',
  })
  deliveryGraceDeadlineAt?: Date | null;

  @ApiPropertyOptional({
    description:
      'When the creator received the product. For an order that requires a ' +
      'physical shipment this is where the delivery clock starts, so list ' +
      'cards need it to render the same deadline the detail page does.',
  })
  productReceivedAt?: Date | null;

  @ApiPropertyOptional({
    description:
      'When the content was delivered. List cards show this as "Delivered on"; ' +
      'without it they fall back to updatedAt, which moves on any later write.',
  })
  deliveredAt?: Date | null;

  @ApiProperty({
    example: 1,
    description: 'Revisions requested so far (0 for an order with none).',
  })
  revisionCount!: number;

  @ApiPropertyOptional({
    type: () => OrderCurrentRevisionDto,
    description:
      'The revision currently in flight, present only while the order is ' +
      'REVISION_REQUESTED / REVISION_SUBMITTED. The revision clock runs from ' +
      'its requestedAt, so a list card cannot date a revision without it.',
  })
  currentRevision?: OrderCurrentRevisionDto;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiPropertyOptional({
    description: 'When the order was refunded (REFUNDED status)',
  })
  refundedAt?: Date | null;

  @ApiPropertyOptional({
    description:
      'Reason the creator rejected the brief or the brand cancelled the order (REJECTED status)',
  })
  cancellationReason?: string | null;

  @ApiPropertyOptional({
    description: 'When the order was rejected/cancelled before acceptance',
  })
  cancelledAt?: Date | null;

  @ApiPropertyOptional({
    description:
      "Which side the order was ended for: 'BRAND' (cancelled) or 'CREATOR' (rejected). For an admin-on-behalf action this is the side support acted for.",
  })
  cancelledBy?: string | null;

  @ApiPropertyOptional({
    description: 'When the latest dispute was opened (for Disputed on)',
  })
  disputeOpenedAt?: Date | null;

  @ApiPropertyOptional({
    enum: OrderDisputeOpenedBy,
    description:
      'Which side raised the latest dispute, so lists can show it without opening the order',
  })
  disputeOpenedBy?: OrderDisputeOpenedBy | null;

  @ApiPropertyOptional({
    description:
      'When the latest dispute was resolved (for Rejected on after dispute resolution)',
  })
  disputeResolvedAt?: Date | null;
}
