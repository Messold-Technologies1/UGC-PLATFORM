import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CreatePushSubscriptionDto,
  DeletePushSubscriptionDto,
  PushSubscriptionSavedDto,
  PushSubscriptionStatusDto,
} from './dto/push-subscription.dto';
import { PushSubscriptionsService } from './push-subscriptions.service';
import { WebPushTransport } from './web-push.transport';

@ApiTags('Push notifications')
@Controller('push')
export class PushController {
  constructor(
    private readonly subscriptions: PushSubscriptionsService,
    private readonly transport: WebPushTransport,
  ) {}

  /**
   * The VAPID public key, and whether push is configured at all.
   *
   * Unauthenticated: the key is public by design — it ships to every browser
   * as `applicationServerKey`, and is useless without the private half.
   *
   * `configured` is the more useful half of the response. It lets the client
   * keep quiet on an environment with no keys instead of asking for
   * notification permission it cannot act on — and a permission prompt
   * answered "no" can never be asked again.
   */
  @Get('vapid-public-key')
  @ApiOperation({ summary: 'VAPID public key for building a subscription' })
  @ApiOkResponse({ type: PushSubscriptionStatusDto })
  getVapidPublicKey(): PushSubscriptionStatusDto {
    return {
      configured: this.transport.isConfigured(),
      publicKey: this.transport.publicKey(),
    };
  }

  @Post('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Register this browser for push' })
  @ApiOkResponse({ type: PushSubscriptionSavedDto })
  @HttpCode(200)
  async subscribe(
    @Body() dto: CreatePushSubscriptionDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PushSubscriptionSavedDto> {
    const { subscriptionCount } = await this.subscriptions.save(
      req.user.id,
      dto,
    );
    return { saved: true, subscriptionCount };
  }

  /**
   * Forget this browser. Called on logout and when push is switched off.
   *
   * Returns 200 whether or not a row was there: the client's job is to make
   * sure the endpoint is gone, and an endpoint the transport already pruned is
   * that job done.
   */
  @Delete('subscriptions')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unregister this browser from push' })
  @ApiOkResponse({ type: PushSubscriptionSavedDto })
  @HttpCode(200)
  async unsubscribe(
    @Body() dto: DeletePushSubscriptionDto,
    @Req() req: Request & { user: { id: string } },
  ): Promise<PushSubscriptionSavedDto> {
    await this.subscriptions.remove(req.user.id, dto.endpoint);
    const subscriptionCount = await this.subscriptions.countForUser(
      req.user.id,
    );
    return { saved: true, subscriptionCount };
  }
}
