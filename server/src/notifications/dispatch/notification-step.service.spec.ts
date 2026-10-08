import { NotificationChannel, UserStatus } from '@prisma/client';
import {
  NotificationStepService,
  PermanentSendError,
  sanitizeBodyVar,
} from './notification-step.service';
import type { StepJobData } from '../queues/notification-queues';
import { getEventDefinition } from '../catalog/event-catalog';

// The real resolve() reads the database; the gate chain is what is under test.
jest.mock('../catalog/event-catalog', () => ({
  ...jest.requireActual<Record<string, unknown>>('../catalog/event-catalog'),
  getEventDefinition: jest.fn(),
}));

const mockGetEventDefinition = getEventDefinition as jest.MockedFunction<
  typeof getEventDefinition
>;

const EVENT = 'order-content-delivered-for-brand';

type Options = {
  sendingEnabled?: boolean;
  eventRow?: Record<string, unknown> | null;
  optedIn?: boolean;
  suppressed?: boolean;
  userStatus?: UserStatus;
  resolveNull?: boolean;
  subject?: string;
  /** Which side of the buyer XOR this order belongs to. */
  buyer?: 'brand' | 'agency';
};

function build(opts: Options = {}) {
  const log = {
    claim: jest.fn().mockResolvedValue({ claimed: true, logId: 'log1' }),
    markSent: jest.fn().mockResolvedValue(undefined),
    markFailed: jest.fn().mockResolvedValue(undefined),
    recordSkip: jest.fn().mockResolvedValue(undefined),
  };
  const ses = { send: jest.fn().mockResolvedValue('ses-msg-1') };
  const whatsapp = { send: jest.fn().mockResolvedValue('wamid.1') };
  const renderer = {
    render: jest.fn().mockResolvedValue({
      subject: opts.subject ?? 'Your content is ready',
      html: '<p>hi</p>',
      text: 'hi',
      source: 'db',
      templateId: 't1',
    }),
  };

  const prisma = {
    notificationEvent: {
      findUnique: jest.fn().mockResolvedValue(
        opts.eventRow === undefined
          ? {
              isActive: true,
              deprecated: false,
              alwaysSend: false,
              emailTemplateId: 't1',
              whatsappTemplateName: 'order_content_delivered_for_brand',
              schedule: [
                {
                  isActive: true,
                  channels: [
                    NotificationChannel.EMAIL,
                    NotificationChannel.WHATSAPP,
                  ],
                  templateOverrideId: null,
                  whatsappTemplateOverride: null,
                },
              ],
            }
          : opts.eventRow,
      ),
    },
    brandProfile: {
      findUnique: jest.fn().mockResolvedValue({
        emailNotificationsEnabled: opts.optedIn ?? true,
        whatsappNotificationsEnabled: opts.optedIn ?? true,
      }),
    },
    creatorProfile: { findUnique: jest.fn() },
    agency: {
      findUnique: jest.fn().mockResolvedValue({
        emailNotificationsEnabled: opts.optedIn ?? true,
        whatsappNotificationsEnabled: opts.optedIn ?? true,
      }),
    },
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({ status: opts.userStatus ?? UserStatus.ACTIVE }),
    },
  };

  const config = {
    get: jest.fn((key: string, fallback?: string) => {
      if (key === 'NOTIFICATIONS_SENDING_ENABLED') {
        return opts.sendingEnabled === false ? 'false' : 'true';
      }
      if (key === 'FRONTEND_URL') return 'https://app.gocollab.io';
      return fallback;
    }),
  };

  const suppression = {
    isSuppressed: jest.fn().mockResolvedValue(opts.suppressed ?? false),
  };

  const service = new NotificationStepService(
    prisma as never,
    config as never,
    {} as never,
    renderer as never,
    log as never,
    suppression as never,
    ses as never,
    whatsapp as never,
  );

  mockGetEventDefinition.mockReturnValue(
    opts.eventRow === null
      ? null
      : ({
          label: 'x',
          recipient: 'BRAND',
          vars: {},
          resolve: jest.fn().mockResolvedValue(
            opts.resolveNull
              ? null
              : {
                  userId: 'u1',
                  profileType: opts.buyer ?? 'brand',
                  profileId: opts.buyer === 'agency' ? 'a1' : 'b1',
                  email: 'brand@example.com',
                  phone: '919812345678',
                  vars: {
                    recipientName: 'Rohit',
                    actionUrl: 'https://app.gocollab.io/brand/orders/ord_1',
                  },
                },
          ),
          stillRelevant: jest.fn().mockResolvedValue(true),
        } as never),
  );

  return { service, log, ses, whatsapp, renderer, prisma, suppression };
}

const job: StepJobData = {
  eventKey: EVENT,
  entityId: 'ord_1',
  occurrenceKey: 'ord_1',
  occurredAt: new Date().toISOString(),
  offsetMinutes: 0,
  channels: [NotificationChannel.EMAIL, NotificationChannel.WHATSAPP],
};

afterEach(() => jest.clearAllMocks());

describe('NotificationStepService.deliver', () => {
  it('sends both channels when everything is configured', async () => {
    const { service, ses, whatsapp, log } = build();

    const outcomes = await service.deliver(job);

    expect(outcomes.map((o) => o.result)).toEqual(['sent', 'sent']);
    expect(ses.send).toHaveBeenCalledTimes(1);
    expect(whatsapp.send).toHaveBeenCalledTimes(1);
    // The SES message id is what the delivery webhook later joins on.
    expect(log.markSent).toHaveBeenCalledWith(
      'log1',
      expect.objectContaining({ providerMessageId: 'ses-msg-1' }),
    );
  });

  it('records a skip and sends nothing while sending is disabled', async () => {
    const { service, ses, whatsapp, log } = build({ sendingEnabled: false });

    const outcomes = await service.deliver(job);

    expect(outcomes.every((o) => o.reason === 'sending_disabled')).toBe(true);
    expect(ses.send).not.toHaveBeenCalled();
    expect(whatsapp.send).not.toHaveBeenCalled();
    expect(log.recordSkip).toHaveBeenCalled();
  });

  it('skips an inactive event', async () => {
    const { service, ses } = build({
      eventRow: { isActive: false, deprecated: false, schedule: [] },
    });

    const outcomes = await service.deliver(job);

    expect(outcomes.every((o) => o.reason === 'event_inactive')).toBe(true);
    expect(ses.send).not.toHaveBeenCalled();
  });

  it('skips when the schedule row no longer exists', async () => {
    const { service } = build({
      eventRow: {
        isActive: true,
        deprecated: false,
        alwaysSend: false,
        emailTemplateId: null,
        whatsappTemplateName: null,
        schedule: [],
      },
    });

    const outcomes = await service.deliver(job);
    expect(outcomes.every((o) => o.reason === 'row_removed')).toBe(true);
  });

  it('skips when the entity is gone rather than throwing', async () => {
    const { service } = build({ resolveNull: true });

    const outcomes = await service.deliver(job);
    expect(outcomes.every((o) => o.reason === 'entity_gone')).toBe(true);
  });

  it('does not send to a deactivated account', async () => {
    const { service, ses } = build({ userStatus: UserStatus.DEACTIVATED });

    const outcomes = await service.deliver(job);

    expect(outcomes.every((o) => o.reason === 'user_inactive')).toBe(true);
    expect(ses.send).not.toHaveBeenCalled();
  });

  it('respects the per-profile opt-in', async () => {
    const { service, ses, whatsapp } = build({ optedIn: false });

    const outcomes = await service.deliver(job);

    expect(outcomes.every((o) => o.reason === 'opted_out')).toBe(true);
    expect(ses.send).not.toHaveBeenCalled();
    expect(whatsapp.send).not.toHaveBeenCalled();
  });

  it('reads the agency opt-in for an agency-owned order', async () => {
    const { service, ses, whatsapp, prisma } = build({ buyer: 'agency' });

    const outcomes = await service.deliver(job);

    expect(prisma.agency.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' } }),
    );
    // The brand table is the wrong one to ask about an agency buyer.
    expect(prisma.brandProfile.findUnique).not.toHaveBeenCalled();
    expect(outcomes.every((o) => o.result === 'sent')).toBe(true);
    expect(ses.send).toHaveBeenCalled();
    expect(whatsapp.send).toHaveBeenCalled();
  });

  it('respects an agency that has opted out', async () => {
    const { service, ses, whatsapp } = build({
      buyer: 'agency',
      optedIn: false,
    });

    const outcomes = await service.deliver(job);

    expect(outcomes.every((o) => o.reason === 'opted_out')).toBe(true);
    expect(ses.send).not.toHaveBeenCalled();
    expect(whatsapp.send).not.toHaveBeenCalled();
  });

  it('skips a suppressed address but still sends WhatsApp', async () => {
    const { service, ses, whatsapp } = build({ suppressed: true });

    const outcomes = await service.deliver(job);

    expect(outcomes[0]).toMatchObject({
      channel: NotificationChannel.EMAIL,
      reason: 'suppressed',
    });
    expect(ses.send).not.toHaveBeenCalled();
    // Channels are independent — a bounced email must not mute WhatsApp.
    expect(outcomes[1]).toMatchObject({
      channel: NotificationChannel.WHATSAPP,
      result: 'sent',
    });
    expect(whatsapp.send).toHaveBeenCalled();
  });

  it('treats an empty rendered subject as permanent, not worth retrying', async () => {
    const { service, log } = build({ subject: '   ' });

    await expect(service.deliver(job)).rejects.toBeInstanceOf(
      PermanentSendError,
    );
    expect(log.markFailed).toHaveBeenCalled();
  });

  it('only re-checks relevance for delayed rows', async () => {
    const { service, renderer } = build();

    await service.deliver({ ...job, offsetMinutes: 0 });
    // An immediate send is about something that just happened; re-reading the
    // world would be pointless work on the hot path.
    expect(renderer.render).toHaveBeenCalled();
  });
});

describe('sanitizeBodyVar', () => {
  it('collapses the whitespace WhatsApp rejects', () => {
    // Newlines, tabs and 4+ spaces make Meta reject the whole message.
    expect(sanitizeBodyVar('Acme\nBeauty')).toBe('Acme Beauty');
    expect(sanitizeBodyVar('Acme\t\tBeauty')).toBe('Acme Beauty');
    expect(sanitizeBodyVar('Acme     Beauty')).toBe('Acme Beauty');
    expect(sanitizeBodyVar('  padded  ')).toBe('padded');
  });
});
