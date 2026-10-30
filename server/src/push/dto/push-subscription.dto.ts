import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * The browser's own PushSubscription, flattened.
 *
 * Shape is dictated by `PushSubscription.toJSON()` in the browser: an endpoint
 * plus two base64url keys. The client sends exactly what it was given rather
 * than anything of our choosing, so the validation here is about size and
 * scheme, not format — a push service may mint any URL it likes.
 */
export class CreatePushSubscriptionDto {
  @ApiProperty({
    example: 'https://fcm.googleapis.com/fcm/send/dQw4w9WgXcQ:APA91bH...',
    description: 'Push service URL issued by the browser. Treated as opaque.',
  })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;

  @ApiProperty({ description: "The browser's public key, base64url." })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  p256dh!: string;

  @ApiProperty({ description: "The browser's auth secret, base64url." })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  auth!: string;

  @ApiPropertyOptional({
    description:
      "Stored verbatim so support can tell a user's devices apart. Never parsed.",
  })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  userAgent?: string;
}

export class DeletePushSubscriptionDto {
  @ApiProperty({ description: 'The endpoint to forget.' })
  @IsUrl({ protocols: ['https'], require_protocol: true })
  @MaxLength(2048)
  endpoint!: string;
}

export class PushSubscriptionStatusDto {
  @ApiProperty({
    example: true,
    description:
      'False when the server has no VAPID keys, in which case the client should not prompt for permission.',
  })
  configured!: boolean;

  @ApiProperty({
    nullable: true,
    description:
      'VAPID public key, for applicationServerKey. Null when not configured.',
  })
  publicKey!: string | null;
}

export class PushSubscriptionSavedDto {
  @ApiProperty({ example: true })
  saved!: boolean;

  @ApiProperty({
    example: 2,
    description: 'How many browsers this account now receives push on.',
  })
  subscriptionCount!: number;
}
