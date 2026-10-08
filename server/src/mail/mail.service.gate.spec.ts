import { MailService } from './mail.service';
import { EmailTemplateKey, type MailNotificationGate } from './mail.types';

/**
 * The per-profile opt-in gate, one case per buyer type.
 *
 * Asserted through `send()` rather than the private method, because what
 * matters is that nothing reaches SES — a gate that returns the right boolean
 * but is consulted too late would still deliver the mail.
 */

const CONFIG: Record<string, string> = {
  SES_FROM_EMAIL: 'no-reply@example.com',
  AWS_SES_ACCESS_KEY_ID: 'key',
  AWS_SES_SECRET_ACCESS_KEY: 'secret',
};

function build(rows: {
  agency?: { emailNotificationsEnabled: boolean } | null;
  brandProfile?: { emailNotificationsEnabled: boolean } | null;
  creatorProfile?: { emailNotificationsEnabled: boolean } | null;
}) {
  const transport = { send: jest.fn().mockResolvedValue(undefined) };
  const prisma = {
    agency: { findUnique: jest.fn().mockResolvedValue(rows.agency ?? null) },
    brandProfile: {
      findUnique: jest.fn().mockResolvedValue(rows.brandProfile ?? null),
    },
    creatorProfile: {
      findUnique: jest.fn().mockResolvedValue(rows.creatorProfile ?? null),
    },
  };
  const service = new MailService(
    {
      get: jest.fn(
        (key: string, fallback?: unknown) => CONFIG[key] ?? fallback,
      ),
    } as never,
    {
      render: jest.fn().mockReturnValue({
        subject: 'Your order',
        html: '<p>hi</p>',
        text: 'hi',
      }),
    } as never,
    transport as never,
    { isSuppressed: jest.fn().mockResolvedValue(false) } as never,
    prisma as never,
  );
  return { service, transport, prisma };
}

function send(service: MailService, gate: MailNotificationGate) {
  return service.send({
    to: 'buyer@example.com',
    templateKey: EmailTemplateKey.ORDER_COMPLETED_FOR_BRAND,
    context: {},
    notificationGate: gate,
  });
}

describe('MailService per-profile opt-in', () => {
  const agencyGate: MailNotificationGate = {
    profileType: 'agency',
    profileId: 'a1',
  };

  it('sends to an agency that has email notifications on', async () => {
    const { service, transport, prisma } = build({
      agency: { emailNotificationsEnabled: true },
    });

    await send(service, agencyGate);

    expect(prisma.agency.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' } }),
    );
    expect(transport.send).toHaveBeenCalled();
  });

  it('does not send to an agency that has opted out', async () => {
    const { service, transport } = build({
      agency: { emailNotificationsEnabled: false },
    });

    await send(service, agencyGate);

    expect(transport.send).not.toHaveBeenCalled();
  });

  it('does not send when the agency row is gone', async () => {
    const { service, transport } = build({ agency: null });

    await send(service, agencyGate);

    expect(transport.send).not.toHaveBeenCalled();
  });

  it('still gates a standalone brand on its own column', async () => {
    const { service, transport, prisma } = build({
      brandProfile: { emailNotificationsEnabled: false },
    });

    await send(service, { profileType: 'brand', profileId: 'b1' });

    expect(prisma.brandProfile.findUnique).toHaveBeenCalled();
    expect(prisma.agency.findUnique).not.toHaveBeenCalled();
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('still gates a creator on its own column', async () => {
    const { service, transport, prisma } = build({
      creatorProfile: { emailNotificationsEnabled: true },
    });

    await send(service, { profileType: 'creator', profileId: 'c1' });

    expect(prisma.creatorProfile.findUnique).toHaveBeenCalled();
    expect(transport.send).toHaveBeenCalled();
  });

  it('lets password reset through without a gate at all', async () => {
    const { service, transport, prisma } = build({});

    await service.send({
      to: 'buyer@example.com',
      templateKey: EmailTemplateKey.PASSWORD_RESET,
      context: {},
    });

    expect(prisma.agency.findUnique).not.toHaveBeenCalled();
    expect(transport.send).toHaveBeenCalled();
  });
});
