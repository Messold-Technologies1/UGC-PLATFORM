import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { TimeoutError, withTimeout } from '../util/with-timeout';

@Injectable()
export class RazorpayService {
  private readonly logger = new Logger(RazorpayService.name);
  private readonly razorpay: Razorpay;
  private readonly keyId: string;
  private readonly requestTimeoutMs: number;

  constructor(private readonly config: ConfigService) {
    const key_id = this.config.get<string>('RAZORPAY_KEY_ID')!;
    const key_secret = this.config.get<string>('RAZORPAY_KEY_SECRET')!;
    this.keyId = key_id;
    this.razorpay = new Razorpay({ key_id, key_secret });
    this.requestTimeoutMs = this.config.get<number>(
      'RAZORPAY_REQUEST_TIMEOUT_MS',
      15_000,
    );
  }

  getPublicKeyId(): string {
    return this.keyId;
  }

  // Disabled — kept for reference (see OrdersService's commented-out
  // adminTriggerRefund for how this was used).
  //
  // /**
  //  * Which Razorpay environment the configured API keys belong to, derived from
  //  * the key id prefix (`rzp_test_` / `rzp_live_`). Handy for diagnosing
  //  * cross-mode failures — e.g. refunding a TEST-mode payment with LIVE keys,
  //  * which Razorpay rejects with a generic "invalid request sent".
  //  */
  // getKeyMode(): 'test' | 'live' | 'unknown' {
  //   if (this.keyId.startsWith('rzp_test')) return 'test';
  //   if (this.keyId.startsWith('rzp_live')) return 'live';
  //   return 'unknown';
  // }

  async createOrder(params: {
    amountPaise: number;
    currency: string;
    receipt: string;
    notes?: Record<string, string>;
  }): Promise<{ id: string; amount: number; currency: string; receipt: string }> {
    const order = await this.callApi('create order', () =>
      this.razorpay.orders.create({
        amount: params.amountPaise,
        currency: params.currency,
        receipt: params.receipt,
        notes: params.notes,
      }),
    );

    const amount =
      typeof order.amount === 'number'
        ? order.amount
        : Number.parseInt(String(order.amount), 10);

    this.logger.log(
      `[payment] razorpay order created orderId=${order.id} amountPaise=${amount} currency=${order.currency} receipt=${order.receipt ?? params.receipt}`,
    );

    return {
      id: order.id,
      amount,
      currency: order.currency,
      receipt: order.receipt ?? params.receipt,
    };
  }

  verifyWebhookSignature(params: {
    rawBody: Buffer;
    webhookSecret: string;
    razorpaySignature: string;
  }): boolean {
    const expected = crypto
      .createHmac('sha256', params.webhookSecret)
      .update(params.rawBody)
      .digest('hex');

    // constant-time compare
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(params.razorpaySignature, 'utf8');
    const valid = a.length === b.length && crypto.timingSafeEqual(a, b);
    if (!valid) {
      // A bad signature means a spoofed/misconfigured webhook — worth flagging.
      this.logger.warn(
        '[payment] razorpay webhook signature verification FAILED',
      );
    }
    return valid;
  }

  // Disabled — kept for reference. Restore alongside getKeyMode above and
  // the commented-out adminTriggerRefund in OrdersService if reinstating
  // Razorpay-driven refunds.
  //
  // async refundPayment(params: {
  //   paymentId: string;
  //   amountPaise?: number;
  //   notes?: Record<string, string>;
  // }): Promise<{ id: string; status: string }> {
  //   // Only send fields that are actually set. Passing `amount: undefined`
  //   // (full refund) or an empty `notes` can be serialized into an invalid
  //   // request body, which Razorpay rejects as a generic BAD_REQUEST_ERROR
  //   // ("invalid request sent"). Omitting the amount performs a full refund.
  //   const options: { amount?: number; notes?: Record<string, string> } = {};
  //   if (typeof params.amountPaise === 'number') {
  //     options.amount = params.amountPaise;
  //   }
  //   if (params.notes && Object.keys(params.notes).length > 0) {
  //     options.notes = params.notes;
  //   }
  //
  //   const refund = await this.callApi('refund payment', () =>
  //     this.razorpay.payments.refund(params.paymentId, options),
  //   );
  //   return { id: refund.id, status: refund.status };
  // }

  private async callApi<T>(label: string, fn: () => Promise<T>): Promise<T> {
    try {
      return await withTimeout(fn(), this.requestTimeoutMs, `Razorpay ${label}`);
    } catch (err) {
      if (err instanceof TimeoutError) {
        throw new ServiceUnavailableException(err.message);
      }
      throw err;
    }
  }
}
