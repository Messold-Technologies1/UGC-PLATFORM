import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

function toOptionalBoolean(value: unknown): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === false) return value;
  if (Array.isArray(value)) return toOptionalBoolean(value[0]);
  if (typeof value === 'string') {
    const s = value.trim().toLowerCase();
    if (s === 'true' || s === '1' || s === 'yes') return true;
    if (s === 'false' || s === '0' || s === 'no') return false;
  }
  return undefined;
}

export class ListOrdersQueryDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Filter orders by lifecycle status',
  })
  @IsOptional()
  @IsEnum(OrderStatus)
  status?: OrderStatus;

  @ApiPropertyOptional({
    description:
      'Filter orders to any of these lifecycle statuses (a status tab maps to ' +
      'several). Sent as a comma-separated list, e.g. "ACCEPTED,CREATOR_PAYMENT_DONE".',
    isArray: true,
    enum: OrderStatus,
  })
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === 'string'
      ? value
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : value,
  )
  @IsEnum(OrderStatus, { each: true })
  statuses?: OrderStatus[];

  @ApiPropertyOptional({
    description: 'Filter orders by brand (BrandProfile id)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  brandId?: string;

  @ApiPropertyOptional({
    description: 'Filter orders by agency (Agency id)',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  agencyId?: string;

  @ApiPropertyOptional({
    example: true,
    description:
      'When true, list only orders currently in the delivery grace period ' +
      '(promised due date has passed, grace deadline has not, and content is ' +
      'still undelivered). Takes precedence over statuses.',
  })
  @IsOptional()
  @Transform(({ value }) => toOptionalBoolean(value))
  @IsBoolean()
  inGracePeriod?: boolean;

  @ApiPropertyOptional({
    example: 'acme',
    maxLength: 120,
    description:
      'Free-text search over the parties on the order and its id: creator ' +
      'display name, brand name, agency name, the client brand named on the ' +
      'brief, the agency credited with placing it, or an order id (a whole ' +
      'uuid, or the leading characters the UI shows as "Order #AB12CD34"). ' +
      'Applies across every lifecycle status, so the status tab badges count ' +
      'the matches in each stage.',
  })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(120)
  search?: string;
}
