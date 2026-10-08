import { WhatsAppService } from './whatsapp.service';
import type { WhatsAppNotificationGate } from './whatsapp.types';

/**
 * The per-profile opt-in gate, mirroring MailService's. Asserted through
 * `send()` so a gate consulted too late would still fail the test.
 */

const CONFIG: Record<string, string> = {
  WHATSAPP_PHONE_NUMBER_ID: 'phone-1',
  WHATSAPP_ACCESS_TOKEN: 'token',
};

function build(rows: {
  agency?: { whatsappNotificationsEnabled: boolean } | null;
  brandProfile?: { whatsappNotificationsEnabled: boolean } | null;
  creatorProfile?: { whatsappNotificationsEnabled: boolean } | null;
}) {
  const transport = { send: jest.fn().mockResolvedValue('wamid.1') };
  const prisma = {
    agency: { findUnique: jest.fn().mockResolvedValue(rows.agency ?? null) },
    brandProfile: {
      findUnique: jest.fn().mockResolvedValue(rows.brandProfile ?? null),
    },
    creatorProfile: {
      findUnique: jest.fn().mockResolvedValue(rows.creatorProfile ?? null),
    },
  };
  const service = new WhatsAppService(
    {
      get: jest.fn(
        (key: string, fallback?: unknown) => CONFIG[key] ?? fallback,
      ),
    } as never,
    transport as never,
    prisma as never,
    { recordStatusUpdate: jest.fn().mockResolvedValue(undefined) } as never,
  );
  return { service, transport, prisma };
}

function send(service: WhatsAppService, gate: WhatsAppNotificationGate) {
  return service.send({
    to: '+919812345678',
    template: 'order_completed_for_brand',
    notificationGate: gate,
  });
}

describe('WhatsAppService per-profile opt-in', () => {
  const agencyGate: WhatsAppNotificationGate = {
    profileType: 'agency',
    profileId: 'a1',
  };

  it('sends to an agency that has WhatsApp notifications on', async () => {
    const { service, transport, prisma } = build({
      agency: { whatsappNotificationsEnabled: true },
    });

    await send(service, agencyGate);

    expect(prisma.agency.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'a1' } }),
    );
    expect(transport.send).toHaveBeenCalled();
  });

  it('does not send to an agency that has opted out', async () => {
    const { service, transport } = build({
      agency: { whatsappNotificationsEnabled: false },
    });

    await send(service, agencyGate);

    expect(transport.send).not.toHaveBeenCalled();
  });

  it('does not send when the agency row is gone', async () => {
    const { service, transport } = build({ agency: null });

    await send(service, agencyGate);

    expect(transport.send).not.toHaveBeenCalled();
  });

  it('asks for the WhatsApp column, not the email one', async () => {
    // The two channels opt in separately, so reading emailNotificationsEnabled
    // here would send WhatsApp to an agency that only agreed to email.
    const { service, prisma } = build({
      agency: { whatsappNotificationsEnabled: true },
    });

    await send(service, agencyGate);

    expect(prisma.agency.findUnique).toHaveBeenCalledWith({
      where: { id: 'a1' },
      select: { whatsappNotificationsEnabled: true },
    });
  });

  it('still gates a standalone brand on its own column', async () => {
    const { service, transport, prisma } = build({
      brandProfile: { whatsappNotificationsEnabled: false },
    });

    await send(service, { profileType: 'brand', profileId: 'b1' });

    expect(prisma.brandProfile.findUnique).toHaveBeenCalled();
    expect(prisma.agency.findUnique).not.toHaveBeenCalled();
    expect(transport.send).not.toHaveBeenCalled();
  });

  it('refuses to send with no gate at all', async () => {
    const { service, transport } = build({
      agency: { whatsappNotificationsEnabled: true },
    });

    await service.send({
      to: '+919812345678',
      template: 'order_completed_for_brand',
    });

    expect(transport.send).not.toHaveBeenCalled();
  });
});
