import { TemplateRendererService } from './template-renderer.service';
import { EmailTemplateKey } from './mail.types';

function makeConfig(overrides: Record<string, string> = {}) {
  const values: Record<string, string> = {
    FRONTEND_URL: 'https://app.gocollab.io',
    ...overrides,
  };
  return {
    get: jest.fn((key: string, defaultValue?: string) =>
      key in values ? values[key] : defaultValue,
    ),
  };
}

function build(overrides?: Record<string, string>): TemplateRendererService {
  const service = new TemplateRendererService(makeConfig(overrides) as never);
  service.onModuleInit();
  return service;
}

describe('TemplateRendererService', () => {
  let service: TemplateRendererService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = build();
  });

  it('renders the password-reset CTA with a clickable, absolute reset link', () => {
    const token = 'gzwE8_eP3-IUzJV9feae6VjpkTbvnpa7IZwEtcZhw7o';
    const actionUrl = `https://app.gocollab.io/reset-password?token=${token}`;

    const { html } = service.render(EmailTemplateKey.PASSWORD_RESET, {
      recipientName: 'Mohit',
      actionUrl,
      expiresInMinutes: 60,
    });

    const href = html.match(/<a href="([^"]*)"[^>]*>\s*Reset password/s)?.[1];

    // The button must carry the full absolute link, not an empty/relative href.
    expect(href).toBe(actionUrl);
    // Regression guard: the query separator `=` must stay literal. When it is
    // HTML-entity-encoded to `&#x3D;`, Gmail refuses to make the button
    // clickable — the symptom that made the reset link appear "not attached".
    expect(html).not.toContain('token&#x3D;');
    expect(href).toMatch(/^https:\/\//);
    expect(href).toContain(`token=${token}`);
  });

  it('renders the logo image when EMAIL_TEMPLATE_LOGO is set', () => {
    const svc = build({ EMAIL_TEMPLATE_LOGO: 'https://cdn.gocollab.io/logo.png' });

    const { html } = svc.render(EmailTemplateKey.PASSWORD_RESET, {
      recipientName: 'Mohit',
      actionUrl: 'https://app.gocollab.io/reset-password?token=abc',
      expiresInMinutes: 60,
    });

    expect(html).toContain('<img');
    expect(html).toContain('src="https://cdn.gocollab.io/logo.png"');
  });

  it('falls back to a text wordmark (no broken image) when the logo is unset', () => {
    const { html } = service.render(EmailTemplateKey.PASSWORD_RESET, {
      recipientName: 'Mohit',
      actionUrl: 'https://app.gocollab.io/reset-password?token=abc',
      expiresInMinutes: 60,
    });

    // No empty-src image that renders as a broken-image icon.
    expect(html).not.toContain('src=""');
    expect(html).not.toMatch(/<img[^>]*\bsrc="\s*"/);
    // Brand name still shown in the header.
    expect(html).toContain('Go Collab');
  });
});
