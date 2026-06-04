import {
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import crypto from 'node:crypto';
import Razorpay from 'razorpay';
import { TimeoutError, withTimeout } from '../util/with-timeout';

@Injectable()
export class RazorpayService {
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
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  async refundPayment(params: {
    paymentId: string;
    amountPaise?: number;
    notes?: Record<string, string>;
  }): Promise<{ id: string; status: string }> {
    const refund = await this.callApi('refund payment', () =>
      this.razorpay.payments.refund(params.paymentId, {
        amount: params.amountPaise,
        notes: params.notes,
      }),
    );
    return { id: refund.id, status: refund.status };
  }

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
