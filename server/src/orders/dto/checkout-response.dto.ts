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
}

