import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreatePushSubscriptionDto } from './dto/push-subscription.dto';

/**
 * Stores and forgets the browsers an account receives push on.
 *
 * Deliberately thin: the interesting lifecycle is elsewhere. Subscriptions are
 * created here but deleted mostly by WebPushTransport, which is the only place
 * that learns a browser has gone away.
 */
@Injectable()
export class PushSubscriptionsService {
  private readonly logger = new Logger(PushSubscriptionsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Record a subscription for this user.
   *
   * Upserted on the endpoint, which is what makes a re-subscribe idempotent:
   * a browser re-registering the same endpoint is the same device, and a
   * second row for it would deliver every notification to it twice.
   *
   * The upsert also re-points an endpoint at the *current* user. That matters
   * on a shared machine: whoever logged in last owns the browser, and without
   * this the previous account would keep receiving push on a device it no
   * longer has access to.
   */
  async save(
    userId: string,
    dto: CreatePushSubscriptionDto,
  ): Promise<{ subscriptionCount: number }> {
    await this.prisma.pushSubscription.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        userId,
        endpoint: dto.endpoint,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: dto.userAgent ?? null,
      },
      update: {
        userId,
        p256dh: dto.p256dh,
        auth: dto.auth,
        userAgent: dto.userAgent ?? null,
        // A browser that just re-subscribed is reachable by definition, so a
        // stale failure count from its previous life must not follow it.
        failureCount: 0,
      },
    });

    const subscriptionCount = await this.prisma.pushSubscription.count({
      where: { userId },
    });
    this.logger.log(
      `saved push subscription user=${userId} total=${subscriptionCount}`,
    );
    return { subscriptionCount };
  }

  /**
   * Forget one browser — on logout, or when the user turns push off.
   *
   * Scoped to the caller's own rows. An endpoint is a bearer-ish string that
   * travels in client code, so an unscoped delete would let anyone holding one
   * unsubscribe somebody else's device.
   */
  async remove(userId: string, endpoint: string): Promise<{ removed: number }> {
    const { count } = await this.prisma.pushSubscription.deleteMany({
      where: { userId, endpoint },
    });
    return { removed: count };
  }

  /** Every browser this account is subscribed from. */
  async countForUser(userId: string): Promise<number> {
    return this.prisma.pushSubscription.count({ where: { userId } });
  }
}
