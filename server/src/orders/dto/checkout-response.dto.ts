import { ApiProperty } from '@nestjs/swagger';

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
}

