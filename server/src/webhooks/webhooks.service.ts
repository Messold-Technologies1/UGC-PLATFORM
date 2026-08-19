import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailSuppressionReason } from '@prisma/client';
import { EmailSuppressionService } from '../mail/email-suppression.service';
import { RazorpayService } from '../razorpay/razorpay.service';
import { OrdersService } from '../orders/orders.service';
import { OrderRealtimeNotifier } from '../realtime/order-realtime.notifier';
import type { SesSnsNotification } from './ses-sns.types';
import {
  verifySnsMessageSignature,
  type SnsIncomingMessage,
} from './sns-signature.verifier';

type RazorpayWebhookBody = {
  event: string;
  payload?: {
    payment?: {
      entity?: {
        id: string;
        order_id: string | null;
        status: string;
        captured: boolean;
        created_at: number; // seconds
        amount?: number | string;
        error_code?: string;
        error_description?: string;
        error_source?: string;
        error_step?: string;
      };
    };
    refund?: {
      entity?: {
        id: string;
        payment_id: string;
        status?: string;
      };
    };
  };
};

function paymentAmountPaise(entity: {
  amount?: number | string | null;
}): number | undefined {
  const a = entity.amount;
  if (a == null) return undefined;
  if (typeof a === 'number' && Number.isFinite(a)) return Math.round(a);
  const n = Number.parseInt(String(a), 10);
  return Number.isFinite(n) ? n : undefined;
}

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly razorpay: RazorpayService,
    private readonly orders: OrdersService,
    private readonly orderRealtime: OrderRealtimeNotifier,
    private readonly emailSuppression: EmailSuppressionService,
  ) {}

  async handleSesSnsWebhook(params: {
    rawBody: Buffer;
    json: unknown;
  }): Promise<void> {
    const message = this.parseSnsMessage(params.json);
    const skipVerify =
      this.config.get<string>('SES_SNS_SKIP_SIGNATURE_VERIFY') === 'true';

    if (!skipVerify) {
      const valid = await verifySnsMessageSignature(message);
      if (!valid) {
        throw new UnauthorizedException('Invalid SNS signature');
      }
    }

    if (
      message.Type === 'SubscriptionConfirmation' ||
      message.Type === 'UnsubscribeConfirmation'
    ) {
      this.logSnsConfirmationReceived(message);
      await this.confirmSnsSubscription(message);
      return;
    }

    if (message.Type !== 'Notification') {
      this.logger.debug(`ignored SNS type=${message.Type}`);
      return;
    }

    await this.handleSesNotification(message.Message, message.TopicArn);
  }

  private parseSnsMessage(json: unknown): SnsIncomingMessage {
    if (!json || typeof json !== 'object') {
      throw new BadRequestException('Invalid SNS payload');
    }
    const m = json as Record<string, unknown>;
    const required = [
      'Type',
      'MessageId',
      'TopicArn',
      'Message',
      'Timestamp',
      'SignatureVersion',
      'Signature',
      'SigningCertURL',
    ] as const;
    for (const key of required) {
      if (typeof m[key] !== 'string' || !m[key]) {
        throw new BadRequestException(`Invalid SNS payload: missing ${key}`);
      }
    }
    return json as SnsIncomingMessage;
  }

  /** Log SubscribeURL so it appears in deploy logs (manual confirm if auto-fetch fails). */
  private logSnsConfirmationReceived(message: SnsIncomingMessage): void {
    const subscribeUrl = message.SubscribeURL?.trim();
    this.logger.log(
      [
        `SNS ${message.Type} received`,
        `topic=${message.TopicArn}`,
        `messageId=${message.MessageId}`,
        subscribeUrl
          ? `SubscribeURL=${subscribeUrl}`
          : 'SubscribeURL=(missing)',
      ].join(' '),
    );
  }

  private async confirmSnsSubscription(
    message: SnsIncomingMessage,
  ): Promise<void> {
    const url = message.SubscribeURL?.trim();
    if (!url) {
      throw new BadRequestException('SNS confirmation missing SubscribeURL');
    }

    try {
      const res = await fetch(url, { method: 'GET' });
      const responseText = await res.text().catch(() => '');
      if (!res.ok) {
        this.logger.error(
          `SNS subscription confirmation HTTP ${res.status} topic=${message.TopicArn} SubscribeURL=${url} body=${responseText.slice(0, 500)}`,
        );
        throw new BadRequestException(
          `SNS subscription confirmation failed: ${res.status}`,
        );
      }

      this.logger.log(
        `SNS subscription confirmed type=${message.Type} topic=${message.TopicArn}`,
      );
    } catch (err) {
      if (err instanceof BadRequestException) {
        throw err;
      }
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `SNS subscription confirmation request failed topic=${message.TopicArn} SubscribeURL=${url} error=${msg}`,
      );
      throw new BadRequestException(
        `SNS subscription confirmation request failed: ${msg}`,
      );
    }
  }

  private async handleSesNotification(
    messageBody: string,
    topicArn: string,
  ): Promise<void> {
    let ses: SesSnsNotification;
    try {
      ses = JSON.parse(messageBody) as SesSnsNotification;
    } catch {
      throw new BadRequestException('Invalid SES notification JSON');
    }

    if (ses.notificationType === 'Bounce') {
      const bounceType = ses.bounce?.bounceType ?? 'Unknown';
      const isPermanent = bounceType === 'Permanent';
      if (!isPermanent) {
        this.logger.log(
          `SES transient bounce topic=${topicArn} type=${bounceType} subType=${ses.bounce?.bounceSubType ?? '?'}`,
        );
        return;
      }

      const recipients = ses.bounce?.bouncedRecipients ?? [];
      for (const r of recipients) {
        const email = r.emailAddress?.trim();
        if (!email) continue;
        await this.emailSuppression.suppress({
          email,
          reason: EmailSuppressionReason.HARD_BOUNCE,
          detail: `${bounceType}/${ses.bounce?.bounceSubType ?? 'unknown'}`,
        });
      }
      return;
    }

    if (ses.notificationType === 'Complaint') {
      const recipients = ses.complaint?.complainedRecipients ?? [];
      for (const r of recipients) {
        const email = r.emailAddress?.trim();
        if (!email) continue;
        await this.emailSuppression.suppress({
          email,
          reason: EmailSuppressionReason.COMPLAINT,
        });
      }
      return;
    }

    this.logger.debug(
      `ignored SES notification type=${(ses as { notificationType?: string }).notificationType ?? 'unknown'}`,
    );
  }

  async handleRazorpayWebhook(params: {
    rawBody: Buffer;
    signature: string | undefined;
    json: unknown;
  }): Promise<void> {
    const secret = this.config.get<string>('RAZORPAY_WEBHOOK_SECRET')!;
    if (!params.signature) throw new UnauthorizedException('Missing signature');

    const ok = this.razorpay.verifyWebhookSignature({
      rawBody: params.rawBody,
      webhookSecret: secret,
      razorpaySignature: params.signature,
    });
    if (!ok) throw new UnauthorizedException('Invalid signature');

    const body = params.json as RazorpayWebhookBody;

    if (body.event === 'payment.captured') {
      const entity = body.payload?.payment?.entity;
      if (!entity?.id || !entity.order_id) {
        throw new BadRequestException('Missing payment entity');
      }
      const orderId = await this.orders.markPaidFromWebhook({
        razorpayOrderId: entity.order_id,
        razorpayPaymentId: entity.id,
        paidAt: new Date(entity.created_at * 1000),
        amountPaise: paymentAmountPaise(entity),
      });
      if (orderId) {
        await this.orderRealtime.emitOrderPayment({
          orderId,
          kind: 'captured',
          audience: 'brand_and_creator',
          meta: { razorpayPaymentId: entity.id },
        });
      } else {
        // Not a single order — this may be a bulk-checkout batch (one payment,
        // many orders). Mark every child order paid and fan out realtime.
        const batchOrderIds = await this.orders.markBatchPaidFromWebhook({
          razorpayOrderId: entity.order_id,
          razorpayPaymentId: entity.id,
          paidAt: new Date(entity.created_at * 1000),
          amountPaise: paymentAmountPaise(entity),
        });
        if (batchOrderIds) {
          for (const batchOrderId of batchOrderIds) {
            await this.orderRealtime.emitOrderPayment({
              orderId: batchOrderId,
              kind: 'captured',
              audience: 'brand_and_creator',
              meta: { razorpayPaymentId: entity.id },
            });
          }
        } else {
          // Not an order or a bulk batch — may be a standalone extra-revisions
          // purchase. Grant the revisions; it emits its own realtime event.
          await this.orders.markRevisionPurchasePaidFromWebhook({
            razorpayOrderId: entity.order_id,
            razorpayPaymentId: entity.id,
            paidAt: new Date(entity.created_at * 1000),
            amountPaise: paymentAmountPaise(entity),
          });
        }
      }
    } else if (body.event === 'payment.failed') {
      const entity = body.payload?.payment?.entity;
      if (!entity?.id || !entity.order_id) {
        this.logger.warn(
          'payment.failed webhook missing payment id or order_id',
        );
        return;
      }
      if (entity.status?.toLowerCase() !== 'failed') {
        this.logger.warn(
          `payment.failed webhook ignored: entity.status=${entity.status ?? 'missing'} pay=${entity.id}`,
        );
        return;
      }

      const orderId = await this.orders.onPaymentFailedFromWebhook({
        razorpayOrderId: entity.order_id,
        razorpayPaymentId: entity.id,
        errorCode: entity.error_code,
        errorDescription: entity.error_description,
        errorSource: entity.error_source,
        errorStep: entity.error_step,
      });
      if (orderId) {
        await this.orderRealtime.emitOrderPayment({
          orderId,
          kind: 'failed',
          audience: 'brand_only',
          meta: {
            razorpayPaymentId: entity.id,
            errorCode: entity.error_code,
            errorDescription: entity.error_description,
          },
        });
      } else {
        // May be a standalone extra-revisions purchase — flag it FAILED so the
        // pending row is settled and a retry starts a fresh charge.
        await this.orders.markRevisionPurchaseFailedFromWebhook({
          razorpayOrderId: entity.order_id,
        });
      }
    } else if (body.event === 'refund.processed') {
      const entity = body.payload?.refund?.entity;
      if (!entity?.id || !entity.payment_id) {
        throw new BadRequestException('Missing refund entity');
      }
      const orderId = await this.orders.markRefundCompletedFromWebhook({
        razorpayRefundId: entity.id,
        razorpayPaymentId: entity.payment_id,
      });
      if (orderId) {
        await this.orderRealtime.emitOrderPayment({
          orderId,
          kind: 'refund_processed',
          audience: 'brand_and_creator',
          meta: {
            razorpayRefundId: entity.id,
            razorpayPaymentId: entity.payment_id,
          },
        });
      }
    } else if (body.event === 'refund.failed') {
      const entity = body.payload?.refund?.entity;
      this.logger.warn(
        `refund.failed payment_id=${entity?.payment_id ?? '?'} refund_id=${entity?.id ?? '?'}`,
      );
      if (entity?.payment_id) {
        const orderId = await this.orders.findOrderIdByRazorpayPaymentId(
          entity.payment_id,
        );
        if (orderId) {
          await this.orderRealtime.emitOrderPayment({
            orderId,
            kind: 'refund_failed',
            audience: 'brand_only',
            meta: {
              razorpayRefundId: entity.id,
              razorpayPaymentId: entity.payment_id,
              refundStatus: entity.status,
            },
          });
        }
      }
    }
    // else: ignore unhandled events (signature already verified)
  }
}
