import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutResponseDto {
  @ApiProperty()
  orderId!: string;

  @ApiProperty()
  razorpayOrderId!: string;

  @ApiProperty()
  amountPaise!: number;

  @ApiProperty()
  currency!: string;

  @ApiProperty()
  razorpayKeyId!: string;

  @ApiPropertyOptional({ description: 'Package portion of amountPaise (paise)' })
  packageAmountPaise?: number;

  @ApiPropertyOptional({ description: 'Add-ons portion of amountPaise (paise)' })
  addOnsAmountPaise?: number;

  @ApiPropertyOptional({ description: 'Number of add-on line items' })
  addOnsCount?: number;

  @ApiPropertyOptional({
    description: 'Pre-discount total (package + add-ons) in paise',
  })
  grossAmountPaise?: number;

  @ApiPropertyOptional({
    description: 'Coupon discount applied to the charge, in paise (0 if none)',
  })
  discountAmountPaise?: number;

  @ApiPropertyOptional({ description: 'Applied coupon code, when a coupon was used' })
  couponCode?: string;

  @ApiPropertyOptional({
    description:
      'True when the net is ₹0 (e.g. a 100% coupon): the order is already placed and no payment is needed.',
  })
  free?: boolean;

  @ApiPropertyOptional({
    description: "Store credit ('Credits') applied to this order, in paise.",
  })
  creditsAppliedPaise?: number;

  @ApiPropertyOptional({
    description:
      'True when store credit fully covered the order: it is already placed and paid, no Razorpay payment is needed.',
  })
  paidFromCredits?: boolean;
}

