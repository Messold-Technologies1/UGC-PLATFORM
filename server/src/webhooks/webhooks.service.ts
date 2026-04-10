import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RazorpayService } from '../razorpay/razorpay.service';
import { OrdersService } from '../orders/orders.service';

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

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly razorpay: RazorpayService,
    private readonly orders: OrdersService,
  ) {}

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
      await this.orders.markPaidFromWebhook({
        razorpayOrderId: entity.order_id,
        razorpayPaymentId: entity.id,
        paidAt: new Date(entity.created_at * 1000),
      });
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

      await this.orders.onPaymentFailedFromWebhook({
        razorpayOrderId: entity.order_id,
        razorpayPaymentId: entity.id,
        errorCode: entity.error_code,
        errorDescription: entity.error_description,
        errorSource: entity.error_source,
        errorStep: entity.error_step,
      });
    } else if (body.event === 'refund.processed') {
      const entity = body.payload?.refund?.entity;
      if (!entity?.id || !entity.payment_id) {
        throw new BadRequestException('Missing refund entity');
      }
      await this.orders.markRefundCompletedFromWebhook({
        razorpayRefundId: entity.id,
        razorpayPaymentId: entity.payment_id,
      });
    } else if (body.event === 'refund.failed') {
      // Order stays REJECTED (or unchanged); admin must fix and retry refund from dashboard/API.
      const entity = body.payload?.refund?.entity;
      this.logger.warn(
        `refund.failed payment_id=${entity?.payment_id ?? '?'} refund_id=${entity?.id ?? '?'}`,
      );
    }
    // else: ignore unhandled events (signature already verified)
  }
}

