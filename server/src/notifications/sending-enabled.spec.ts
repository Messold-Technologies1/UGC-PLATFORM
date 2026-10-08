import { ConfigService } from '@nestjs/config';
import { notificationsSendingEnabled } from './sending-enabled';

const config = (value?: string) =>
  ({ get: jest.fn(() => value) }) as unknown as ConfigService;

describe('notificationsSendingEnabled', () => {
  it('is off unless explicitly enabled', () => {
    // The default has to be "do not send": an environment that forgets the
    // variable should go quiet, never mail real people by accident.
    expect(notificationsSendingEnabled(config(undefined))).toBe(false);
    expect(notificationsSendingEnabled(config('false'))).toBe(false);
    // Exact string only — no truthiness, no case folding.
    expect(notificationsSendingEnabled(config('TRUE'))).toBe(false);
    expect(notificationsSendingEnabled(config('1'))).toBe(false);
  });

  it('is on for exactly "true"', () => {
    expect(notificationsSendingEnabled(config('true'))).toBe(true);
  });
});
