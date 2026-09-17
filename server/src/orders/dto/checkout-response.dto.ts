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
}

