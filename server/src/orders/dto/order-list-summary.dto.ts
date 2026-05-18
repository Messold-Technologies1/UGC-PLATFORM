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

  @ApiPropertyOptional()
  deliveryDeadlineAt?: Date | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
