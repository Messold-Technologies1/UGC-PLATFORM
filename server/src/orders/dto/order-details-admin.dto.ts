import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderDetailsPublicDto } from './order-details-public.dto';
import { OrderActionActorDto } from './order-action-actor.dto';

export class OrderRevisionPurchaseDto {
  @ApiProperty({
    example: 2,
    description: 'Revisions granted by this purchase',
  })
  revisionsAdded!: number;

  @ApiProperty({ example: 20000, description: 'Per-pack price in paise' })
  unitAmountPaise!: number;

  @ApiProperty({ example: 60000, description: 'Amount paid for this purchase' })
  expectedAmountPaise!: number;

  @ApiPropertyOptional()
  paidAt?: Date | null;
}

export class OrderUsageRightsPurchaseDto {
  @ApiProperty({
    example: 30,
    description: 'Usage-rights days granted by this purchase',
  })
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
  @ApiProperty({
    description: 'Total the brand paid for usage-rights extensions',
  })
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
  @ApiProperty({
    description:
      'Total the brand settled (cash + store credit). 0 until the order is paid — an unpaid order has a quote, not a payment.',
  })
  brandPaidPaise!: number;

  @ApiProperty({
    description:
      'The part of brandPaidPaise charged through Razorpay. The only amount refundable to a card/bank.',
  })
  cashPaidPaise!: number;

  @ApiProperty({
    description:
      'The part of brandPaidPaise funded from the brand store credit wallet. Returned to the wallet, never to a card.',
  })
  creditPaidPaise!: number;

  @ApiProperty({
    description:
      'Base package + add-ons quoted on the order (shown even when unpaid)',
  })
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

  @ApiProperty({
    description:
      'The part of refundToBrandPaise to return through Razorpay (real money).',
  })
  refundToBrandCashPaise!: number;

  @ApiProperty({
    description:
      'The part of refundToBrandPaise to return to the brand credit wallet.',
  })
  refundToBrandCreditPaise!: number;

  @ApiProperty({ description: 'Base + add-ons + used extras' })
  earnedPaise!: number;

  @ApiProperty({
    description:
      'Amount the platform fee is charged on: pre-coupon (gross) base + add-ons + used extras',
  })
  platformFeeBasePaise!: number;

  @ApiProperty({ description: '20% of platformFeeBasePaise (the gross base)' })
  platformFeePaise!: number;

  @ApiProperty({ description: 'earned − platform fee' })
  payToCreatorPaise!: number;
}

/**
 * The reward credit this order earned the brand on completion. Non-refundable
 * store credit, so admins can see it was granted but never owe it back as cash.
 */
export class OrderCompletionCreditDto {
  @ApiProperty({ example: 5000, description: 'Reward granted, in paise' })
  amountPaise!: number;

  @ApiProperty({ description: 'When the reward was credited' })
  creditedAt!: Date;
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

  @ApiPropertyOptional({
    type: () => OrderActionActorDto,
    nullable: true,
    description:
      'Who ended the order early (REJECTED). role ADMIN = support acted on a party behalf; the attributed side is cancelledBy.',
  })
  cancelledByActor?: OrderActionActorDto | null;

  @ApiPropertyOptional({
    type: () => OrderActionActorDto,
    nullable: true,
    description:
      'Who accepted the brief. role ADMIN = support accepted on the creator behalf.',
  })
  briefAcceptedByActor?: OrderActionActorDto | null;

  @ApiPropertyOptional({
    type: () => OrderCompletionCreditDto,
    nullable: true,
    description:
      'Reward credit granted to the brand when this order completed; null when none was granted (feature off at the time, or a free order).',
  })
  completionCredit?: OrderCompletionCreditDto | null;
}
