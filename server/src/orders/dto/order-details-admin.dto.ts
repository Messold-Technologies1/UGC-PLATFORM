import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderDetailsPublicDto } from './order-details-public.dto';

export class OrderRevisionPurchaseDto {
  @ApiProperty({ example: 2, description: 'Revisions granted by this purchase' })
  revisionsAdded!: number;

  @ApiProperty({ example: 20000, description: 'Per-pack price in paise' })
  unitAmountPaise!: number;

  @ApiProperty({ example: 60000, description: 'Amount paid for this purchase' })
  expectedAmountPaise!: number;

  @ApiPropertyOptional()
  paidAt?: Date | null;
}

export class OrderUsageRightsPurchaseDto {
  @ApiProperty({ example: 30, description: 'Usage-rights days granted by this purchase' })
  daysAdded!: number;

  @ApiProperty({ example: 30000, description: 'Per-block price in paise' })
  unitAmountPaise!: number;

  @ApiProperty({ example: 90000, description: 'Amount paid for this purchase' })
  expectedAmountPaise!: number;

  @ApiPropertyOptional()
  paidAt?: Date | null;
}

/** Settlement figures for usage-rights purchases (non-refundable). All paise.
 *  brandPaid = platformFee + payToCreator. */
export class OrderUsageRightsSettlementDto {
  @ApiProperty({ description: 'Total the brand paid for usage-rights extensions' })
  brandPaidPaise!: number;

  @ApiProperty({ description: '20% platform fee' })
  platformFeePaise!: number;

  @ApiProperty({ description: 'brandPaid − platform fee' })
  payToCreatorPaise!: number;

  @ApiProperty({ description: 'Total extra usage-rights days purchased' })
  daysPurchased!: number;
}

/** Settlement figures for an order. All paise. brandPaid = payToCreator +
 *  platformFee + refundToBrand. */
export class OrderPricingLedgerDto {
  @ApiProperty()
  brandPaidPaise!: number;

  @ApiProperty()
  basePlusAddOnsPaise!: number;

  @ApiProperty()
  extraPaidPaise!: number;

  @ApiProperty()
  extraRevisionsPurchased!: number;

  @ApiProperty()
  extraRevisionsUsed!: number;

  @ApiProperty()
  extraRevisionsUnused!: number;

  @ApiProperty({ description: 'Value of purchased-but-unused extra revisions' })
  refundToBrandPaise!: number;

  @ApiProperty({ description: 'Base + add-ons + used extras' })
  earnedPaise!: number;

  @ApiProperty({ description: '20% platform fee on earned' })
  platformFeePaise!: number;

  @ApiProperty({ description: 'earned − platform fee' })
  payToCreatorPaise!: number;
}

export class OrderDetailsAdminDto extends OrderDetailsPublicDto {
  @ApiPropertyOptional()
  razorpayOrderId?: string | null;

  @ApiPropertyOptional()
  razorpayPaymentId?: string | null;

  @ApiPropertyOptional()
  razorpayRefundId?: string | null;

  @ApiPropertyOptional({ type: () => OrderPricingLedgerDto })
  pricingLedger?: OrderPricingLedgerDto;

  @ApiPropertyOptional({ type: () => [OrderRevisionPurchaseDto] })
  revisionPurchases?: OrderRevisionPurchaseDto[];

  @ApiPropertyOptional({ type: () => [OrderUsageRightsPurchaseDto] })
  usageRightsPurchases?: OrderUsageRightsPurchaseDto[];

  @ApiPropertyOptional({ type: () => OrderUsageRightsSettlementDto })
  usageRightsSettlement?: OrderUsageRightsSettlementDto;
}
