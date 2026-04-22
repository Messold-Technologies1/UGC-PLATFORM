import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderDetailsPublicDto } from './order-details-public.dto';

export class OrderDetailsAdminDto extends OrderDetailsPublicDto {
  @ApiPropertyOptional()
  razorpayOrderId?: string | null;

  @ApiPropertyOptional()
  razorpayPaymentId?: string | null;

  @ApiPropertyOptional()
  razorpayRefundId?: string | null;
}

