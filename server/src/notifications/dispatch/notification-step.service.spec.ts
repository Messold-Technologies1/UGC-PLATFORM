import { NotificationChannel, UserStatus } from '@prisma/client';
import {
  NotificationStepService,
  PermanentSendError,
  sanitizeBodyVar,
} from './notification-step.service';
import { PermanentPushError } from '../../push/web-push.transport';
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
  /** What the relevance check answers: true, false, or null for "gone". */
  stillRelevant?: boolean | null;
  /** Event vars to render after `{{1}}` on WhatsApp, in placeholder order. */
  whatsappBodyVars?: string[];
  /** Extra values the stubbed resolve() returns, for those placeholders. */
  extraVars?: Record<string, string>;
  /** How many browsers the recipient has granted push on. */
  pushSubscriptions?: number;
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
  const push = {
    sendToUser: jest
      .fn()
      .mockResolvedValue({ delivered: 1, pruned: 0, failed: 0 }),
  };
  const pushSubscriptions = {
    countForUser: jest.fn().mockResolvedValue(opts.pushSubscriptions ?? 1),
  };
  const renderer = {
    render: jest.fn().mockResolvedValue({
      subject: opts.subject ?? 'Your content is ready',
      html: '<p>hi</p>',
      text: 'hi',
      source: 'db',
      templateId: 't1',
    }),
    renderPush: jest.fn().mockResolvedValue({
      title: opts.subject ?? 'Your content is ready',
      body: 'hi',
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
        pushNotificationsEnabled: opts.optedIn ?? true,
      }),
    },
    creatorProfile: { findUnique: jest.fn() },
    agency: {
      findUnique: jest.fn().mockResolvedValue({
        emailNotificationsEnabled: opts.optedIn ?? true,
        whatsappNotificationsEnabled: opts.optedIn ?? true,
        pushNotificationsEnabled: opts.optedIn ?? true,
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
    push as never,
    pushSubscriptions as never,
  );

  mockGetEventDefinition.mockReturnValue(
    opts.eventRow === null
      ? null
      : ({
          label: 'x',
          recipient: 'BRAND',
          vars: {},
          ...(opts.whatsappBodyVars
            ? { whatsappBodyVars: opts.whatsappBodyVars }
            : {}),
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
                    ...(opts.extraVars ?? {}),
                  },
                },
          ),
          stillRelevant: jest
            .fn()
            .mockResolvedValue(
              opts.stillRelevant === undefined ? true : opts.stillRelevant,
            ),
        } as never),
  );

  return {
    service,
    log,
    ses,
    whatsapp,
    push,
    pushSubscriptions,
    renderer,
    prisma,
    suppression,
  };
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

  /**
   * `{{1}}` is the recipient's name on every template. An event that needs more
   * opts in by naming vars, and the ORDER of those names is the order of the
   * Meta placeholders — get it wrong and the brand is told the work arrived on
   * the day it is due to close.
   */
  it('sends only the recipient name by default', async () => {
    const { service, whatsapp } = build();

    await service.deliver(job);

    const [sent] = whatsapp.send.mock.calls[0] as [{ bodyVars: string[] }];
    expect(sent.bodyVars).toEqual(['Rohit']);
  });

  it("appends an event's declared vars after the name, in order", async () => {
    const { service, whatsapp } = build({
      whatsappBodyVars: ['deliveredAt', 'autoAcceptAt'],
      extraVars: {
        deliveredAt: '10 Mar 2026, 1:15 pm',
        autoAcceptAt: '15 Mar 2026, 9:00 am',
      },
    });

    await service.deliver(job);

    const [sent] = whatsapp.send.mock.calls[0] as [{ bodyVars: string[] }];
    expect(sent.bodyVars).toEqual([
      'Rohit',
      '10 Mar 2026, 1:15 pm',
      '15 Mar 2026, 9:00 am',
    ]);
  });

  /**
   * A var the resolve() did not supply renders as an empty string rather than
   * `undefined` — a blank in the message is bad, "undefined" in a WhatsApp to a
   * paying brand is worse, and dropping it would shift every later placeholder.
   */
  it('keeps the placeholder count when a declared var is missing', async () => {
    const { service, whatsapp } = build({
      whatsappBodyVars: ['deliveredAt', 'autoAcceptAt'],
      extraVars: { deliveredAt: '10 Mar 2026, 1:15 pm' },
    });

    await service.deliver(job);

    const [sent] = whatsapp.send.mock.calls[0] as [{ bodyVars: string[] }];
    expect(sent.bodyVars).toEqual(['Rohit', '10 Mar 2026, 1:15 pm', '']);
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

describe('a delayed send that is no longer warranted', () => {
  // The log has to separate the two ways a delayed send can decline, because
  // one of them is the system working and the other is a misconfiguration —
  // and before this they were recorded identically.
  const delayed: StepJobData = { ...job, offsetMinutes: 30 };

  it('records not_relevant when the person already acted', async () => {
    const { service, log } = build({ stillRelevant: false });

    const outcomes = await service.deliver(delayed);

    expect(outcomes.every((o) => o.reason === 'not_relevant')).toBe(true);
    expect(log.recordSkip).toHaveBeenCalledWith(
      expect.objectContaining({ skippedReason: 'not_relevant' }),
    );
  });

  it('records entity_gone when the entity cannot be found', async () => {
    // A worker pointed at the wrong database answers null for everything. That
    // has to look different from restraint, or the log says the system is
    // healthy while nothing is being delivered.
    const { service, log } = build({ stillRelevant: null });

    const outcomes = await service.deliver(delayed);

    expect(outcomes.every((o) => o.reason === 'entity_gone')).toBe(true);
    expect(log.recordSkip).toHaveBeenCalledWith(
      expect.objectContaining({ skippedReason: 'entity_gone' }),
    );
  });

  it('does not consult the check at all for an immediate send', async () => {
    // offsetMinutes 0 is about something that just happened, so there is
    // nothing to re-check and a null answer must not strand it.
    const { service, log } = build({ stillRelevant: null });

    await service.deliver(job);

    expect(log.recordSkip).not.toHaveBeenCalledWith(
      expect.objectContaining({ skippedReason: 'entity_gone' }),
    );
  });
});

describe('one channel failing', () => {
  it('still tries the other one', async () => {
    // The loop used to abort on the first throw, so an SES outage silently
    // took WhatsApp with it — while the comment above it promised otherwise.
    const { service, ses, whatsapp, log } = build();
    ses.send.mockRejectedValue(new Error('SES is down'));

    await expect(service.deliver(job)).rejects.toThrow('SES is down');

    expect(whatsapp.send).toHaveBeenCalled();
    expect(log.markFailed).toHaveBeenCalledTimes(1);
    expect(log.markSent).toHaveBeenCalledTimes(1);
  });

  it('fails the job with the retryable error, not the permanent one', async () => {
    // The job carries one error and that error decides whether BullMQ tries
    // again. Raising the permanent one would strand the channel a retry would
    // have delivered.
    const { service, ses, whatsapp } = build();
    ses.send.mockRejectedValue(new PermanentSendError('bad template'));
    whatsapp.send.mockRejectedValue(new Error('rate limited'));

    await expect(service.deliver(job)).rejects.toThrow('rate limited');
  });

  it('raises the permanent error when every channel is permanent', async () => {
    const { service, ses, whatsapp } = build();
    ses.send.mockRejectedValue(new PermanentSendError('bad email template'));
    whatsapp.send.mockRejectedValue(new PermanentSendError('bad wa template'));

    await expect(service.deliver(job)).rejects.toBeInstanceOf(
      PermanentSendError,
    );
  });
});

describe('NotificationStepService.deliver — the push channel', () => {
  const pushJob: StepJobData = {
    ...job,
    channels: [NotificationChannel.PUSH],
  };

  function pushEventRow() {
    return {
      isActive: true,
      deprecated: false,
      alwaysSend: false,
      emailTemplateId: 't1',
      whatsappTemplateName: null,
      schedule: [
        {
          isActive: true,
          channels: [NotificationChannel.PUSH],
          templateOverrideId: null,
          whatsappTemplateOverride: null,
        },
      ],
    };
  }

  it('fans the event out to the account rather than to an address', async () => {
    const { service, push, log } = build({ eventRow: pushEventRow() });

    const outcomes = await service.deliver(pushJob);

    expect(outcomes).toEqual([
      { channel: NotificationChannel.PUSH, result: 'sent' },
    ]);
    expect(push.sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        title: 'Your content is ready',
        body: 'hi',
        url: 'https://app.gocollab.io/brand/orders/ord_1',
      }),
    );
    // No provider id: a push touches N services and none of them hands back an
    // identifier a webhook will later quote.
    expect(log.markSent).toHaveBeenCalledWith(
      'log1',
      expect.objectContaining({ providerMessageId: null }),
    );
  });

  // The log's identity has to stay one row per user per event per offset, the
  // way it is for the channels that do have an address.
  it('claims under a synthetic per-user address', async () => {
    const { service, log } = build({ eventRow: pushEventRow() });

    await service.deliver(pushJob);

    expect(log.claim).toHaveBeenCalledWith(
      expect.objectContaining({
        toAddress: 'push:u1',
        channel: NotificationChannel.PUSH,
      }),
    );
  });

  // Declared per event, because "you may already be looking at this" is true
  // of a chat message and false of an order changing state.
  it('passes the event’s suppress-when-viewing flag to the browser', async () => {
    const { service, push } = build({ eventRow: pushEventRow() });

    await service.deliver(pushJob);

    expect(push.sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ suppressIfVisible: false }),
    );
  });

  it('collapses repeats about one entity under a single tag', async () => {
    const { service, push } = build({ eventRow: pushEventRow() });

    await service.deliver(pushJob);

    expect(push.sendToUser).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({ tag: `${EVENT}:ord_1` }),
    );
  });

  // Recorded as its own reason, not as a generic failure: the rate of this
  // skip is the permission-grant funnel.
  it('skips, without claiming, when the account has granted push nowhere', async () => {
    const { service, log, push } = build({
      eventRow: pushEventRow(),
      pushSubscriptions: 0,
    });

    const outcomes = await service.deliver(pushJob);

    expect(outcomes).toEqual([
      {
        channel: NotificationChannel.PUSH,
        result: 'skipped',
        reason: 'no_push_subscription',
      },
    ]);
    expect(log.recordSkip).toHaveBeenCalledWith(
      expect.objectContaining({ skippedReason: 'no_push_subscription' }),
    );
    // Not claimed, so granting permission later is not refused as a duplicate.
    expect(log.claim).not.toHaveBeenCalled();
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('respects the per-profile push opt-out', async () => {
    const { service, log, push } = build({
      eventRow: pushEventRow(),
      optedIn: false,
    });

    const outcomes = await service.deliver(pushJob);

    expect(outcomes[0]).toMatchObject({
      result: 'skipped',
      reason: 'opted_out',
    });
    expect(log.recordSkip).toHaveBeenCalledWith(
      expect.objectContaining({ skippedReason: 'opted_out' }),
    );
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  it('sends nothing in shadow mode', async () => {
    const { service, push } = build({
      eventRow: pushEventRow(),
      sendingEnabled: false,
    });

    const outcomes = await service.deliver(pushJob);

    expect(outcomes[0]).toMatchObject({ reason: 'sending_disabled' });
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  // The transport raises its own permanent type; the engine only knows about
  // this module's, so a failed translation would cost three attempts instead
  // of one on an error no retry can fix.
  it('translates a permanent transport failure into the engine’s own', async () => {
    const { service, push, log } = build({ eventRow: pushEventRow() });
    push.sendToUser.mockRejectedValue(
      new PermanentPushError('payload too large'),
    );

    await expect(service.deliver(pushJob)).rejects.toBeInstanceOf(
      PermanentSendError,
    );
    expect(log.markFailed).toHaveBeenCalled();
  });

  it('retries a transport failure that is worth retrying', async () => {
    const { service, push } = build({ eventRow: pushEventRow() });
    push.sendToUser.mockRejectedValue(new Error('ETIMEDOUT'));

    await expect(service.deliver(pushJob)).rejects.toThrow('ETIMEDOUT');
  });

  // A notification with no title shows the site name and nothing else, which
  // tells the recipient less than not sending would.
  it('refuses a template that renders an empty title', async () => {
    const { service, renderer, push } = build({ eventRow: pushEventRow() });
    renderer.renderPush.mockResolvedValue({
      title: '   ',
      body: 'hi',
      templateId: 't1',
    });

    await expect(service.deliver(pushJob)).rejects.toBeInstanceOf(
      PermanentSendError,
    );
    expect(push.sendToUser).not.toHaveBeenCalled();
  });

  // A WhatsApp outage must not cost the push, and vice versa — the same
  // independence the other two channels already have between them.
  it('delivers push even when another channel on the row fails', async () => {
    const { service, push, ses } = build({
      eventRow: {
        isActive: true,
        deprecated: false,
        alwaysSend: false,
        emailTemplateId: 't1',
        whatsappTemplateName: null,
        schedule: [
          {
            isActive: true,
            channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
            templateOverrideId: null,
            whatsappTemplateOverride: null,
          },
        ],
      },
    });
    ses.send.mockRejectedValue(new Error('SES is down'));

    await expect(
      service.deliver({
        ...job,
        channels: [NotificationChannel.EMAIL, NotificationChannel.PUSH],
      }),
    ).rejects.toThrow('SES is down');
    expect(push.sendToUser).toHaveBeenCalledTimes(1);
  });
});
