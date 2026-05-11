import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';

export class OrderDetailsPublicDto {
  @ApiProperty({ example: 'uuid' })
  id!: string;

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ example: 'Basic package' })
  packageNameSnapshot!: string;

  @ApiProperty({ example: '199.99' })
  priceAmountSnapshot!: string;

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
      'True when the linked brief required physical shipment to the creator (snapshot at brief submit)',
  })
  requiresPhysicalProductShipment!: boolean;

  @ApiPropertyOptional()
  courierName?: string | null;

  @ApiPropertyOptional()
  trackingId?: string | null;

  @ApiPropertyOptional()
  dispatchedAt?: Date | null;

  @ApiPropertyOptional()
  productReceivedAt?: Date | null;

  @ApiProperty({ example: true })
  hasBrief!: boolean;

  @ApiPropertyOptional()
  deliveryDeadlineAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;

  @ApiProperty({ type: [String], example: ['15s reel', 'testimonial'] })
  deliverablesSnapshot!: string[];

  @ApiProperty({ example: 1 })
  maxRevisionsSnapshot!: number;

  @ApiProperty({
    description: 'Add-ons snapshot taken at checkout time',
    example: [{ id: 'uuid', name: 'Extra hook', priceAmount: '199.00' }],
  })
  addOnsSnapshot!: Array<{
    id: string;
    name: string;
    priceAmount: string;
    description: string | null;
  }>;

  @ApiPropertyOptional({ example: '199.00' })
  addOnsTotalSnapshot?: string | null;

  @ApiProperty({ example: 29900, description: 'Expected total amount in paise' })
  expectedAmountPaise!: number;

  @ApiPropertyOptional()
  deliveredAt?: Date | null;

  @ApiPropertyOptional()
  acceptedAt?: Date | null;

  @ApiPropertyOptional()
  creatorPaidAt?: Date | null;

  @ApiProperty({ example: 0 })
  revisionCount!: number;

  @ApiPropertyOptional()
  refundedAt?: Date | null;
}

