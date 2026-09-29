import { TemplateRendererService } from '../../mail/template-renderer.service';
import { EmailTemplateKey } from '../../mail/mail.types';
import {
  NotificationTemplateRenderer,
  deriveText,
} from './notification-template-renderer.service';

function makeLegacy(): TemplateRendererService {
  const config = {
    get: jest.fn((key: string, fallback?: string) =>
      key === 'FRONTEND_URL' ? 'https://app.gocollab.io' : fallback,
    ),
  };
  const service = new TemplateRendererService(config as never);
  service.onModuleInit();
  return service;
}

type Row = {
  id: string;
  version: number;
  subjectHbs: string;
  htmlHbs: string;
  textHbs: string | null;
  isActive: boolean;
};

function makePrisma(rows: Record<string, Row>, byId: Record<string, Row> = {}) {
  return {
    notificationTemplate: {
      findUnique: jest.fn(
        ({ where }: { where: { id?: string; name?: string } }) =>
          Promise.resolve(
            where.id
              ? (byId[where.id] ?? null)
              : (rows[where.name ?? ''] ?? null),
          ),
      ),
    },
  };
}

const KEY = EmailTemplateKey.ORDER_CONTENT_DELIVERED_FOR_BRAND;
const context = {
  recipientName: 'Rohit',
  creatorName: 'Ananya R',
  packageName: 'Standard',
  orderId: 'ord_1',
  deliveredAt: '02 Oct 2026',
  actionUrl: 'https://app.gocollab.io/brand/orders/ord_1',
};

describe('NotificationTemplateRenderer', () => {
  let legacy: TemplateRendererService;

  beforeEach(() => {
    legacy = makeLegacy();
  });

  it('falls back to the bundled file when no template row exists', async () => {
    const renderer = new NotificationTemplateRenderer(
      makePrisma({}) as never,
      legacy,
    );

    const result = await renderer.render({ templateName: KEY, context });

    expect(result.source).toBe('disk');
    expect(result.templateId).toBeNull();
    // The fallback must be byte-identical to what ships today — this is what
    // makes the migration invisible until a row is seeded.
    expect(result).toMatchObject(legacy.render(KEY, context));
  });

  it('prefers a database template over the bundled file', async () => {
    const rows = {
      [KEY]: {
        id: 't1',
        version: 1,
        subjectHbs: 'DB subject for {{creatorName}}',
        htmlHbs: '<p>DB body for {{recipientName}}</p>',
        textHbs: 'DB text for {{recipientName}}',
        isActive: true,
      },
    };
    const renderer = new NotificationTemplateRenderer(
      makePrisma(rows) as never,
      legacy,
    );

    const result = await renderer.render({ templateName: KEY, context });

    expect(result.source).toBe('db');
    expect(result.templateId).toBe('t1');
    expect(result.subject).toBe('DB subject for Ananya R');
    expect(result.text).toBe('DB text for Rohit');
    // Still wrapped in the shared shell, so branding does not depend on what
    // an admin typed.
    expect(result.html).toContain('DB body for Rohit');
    expect(result.html).toContain('<!DOCTYPE html');
  });

  it('uses a schedule row override ahead of the event template', async () => {
    const base: Row = {
      id: 'base',
      version: 1,
      subjectHbs: 'base',
      htmlHbs: '<p>base</p>',
      textHbs: null,
      isActive: true,
    };
    const override: Row = {
      ...base,
      id: 'ovr',
      subjectHbs: 'override subject',
    };

    const renderer = new NotificationTemplateRenderer(
      makePrisma({ [KEY]: base }, { ovr: override }) as never,
      legacy,
    );

    const result = await renderer.render({
      templateId: 'ovr',
      templateName: KEY,
      context,
    });

    expect(result.templateId).toBe('ovr');
    expect(result.subject).toBe('override subject');
  });

  it('falls back to the event template when the override is inactive', async () => {
    const base: Row = {
      id: 'base',
      version: 1,
      subjectHbs: 'base subject',
      htmlHbs: '<p>base</p>',
      textHbs: null,
      isActive: true,
    };
    const inactive: Row = { ...base, id: 'ovr', isActive: false };

    const renderer = new NotificationTemplateRenderer(
      makePrisma({ [KEY]: base }, { ovr: inactive }) as never,
      legacy,
    );

    const result = await renderer.render({
      templateId: 'ovr',
      templateName: KEY,
      context,
    });

    // An admin deactivating a template must not start failing sends.
    expect(result.templateId).toBe('base');
    expect(result.subject).toBe('base subject');
  });

  it('derives a plain-text part when the template stores none', async () => {
    const rows = {
      [KEY]: {
        id: 't1',
        version: 1,
        subjectHbs: 'subject',
        htmlHbs:
          '<p>Hi {{recipientName}},</p><p>Your order is ready.</p><a href="https://x.test/go">View order</a>',
        textHbs: null,
        isActive: true,
      },
    };
    const renderer = new NotificationTemplateRenderer(
      makePrisma(rows) as never,
      legacy,
    );

    const { text } = await renderer.render({ templateName: KEY, context });

    expect(text).toContain('Hi Rohit,');
    expect(text).toContain('Your order is ready.');
    // The link target survives, otherwise the text part is a dead end.
    expect(text).toContain('https://x.test/go');
    expect(text).not.toContain('<p>');
  });

  it('recompiles when the version changes, so an edit goes live without a restart', async () => {
    const row: Row = {
      id: 't1',
      version: 1,
      subjectHbs: 'v1',
      htmlHbs: '<p>v1</p>',
      textHbs: null,
      isActive: true,
    };
    const rows = { [KEY]: row };
    const renderer = new NotificationTemplateRenderer(
      makePrisma(rows) as never,
      legacy,
    );

    expect(
      (await renderer.render({ templateName: KEY, context })).subject,
    ).toBe('v1');

    rows[KEY] = { ...row, version: 2, subjectHbs: 'v2' };
    expect(
      (await renderer.render({ templateName: KEY, context })).subject,
    ).toBe('v2');
  });
});

describe('deriveText', () => {
  it('collapses runs of blank lines', () => {
    expect(deriveText('<p>one</p><p></p><p></p><p>two</p>')).toBe('one\n\ntwo');
  });

  it('leaves a link alone when the label already contains the URL', () => {
    expect(deriveText('<a href="https://x.test">https://x.test</a>')).toBe(
      'https://x.test',
    );
  });
});
