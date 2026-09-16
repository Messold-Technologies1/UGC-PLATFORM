import { PartialType } from '@nestjs/swagger';
import { CreateCouponDto } from './create-coupon.dto';

/** All fields optional — patch a coupon's metadata, value, or active state. */
export class UpdateCouponDto extends PartialType(CreateCouponDto) {}
